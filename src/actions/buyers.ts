"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { CreateBuyerSchema, UpdateBuyerSchema } from "@/schemas";
import { revalidatePath } from "next/cache";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export async function getBuyers({
  page = 1,
  pageSize = 20,
  search = "",
  isActive,
}: PaginationParams = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "buyers:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view buyers");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search.trim()) {
    where.OR = [
      { companyName: { contains: search.trim(), mode: "insensitive" } },
      { contactPerson: { contains: search.trim(), mode: "insensitive" } },
      { phone: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const [total, buyers] = await Promise.all([
    prisma.buyer.count({ where }),
    prisma.buyer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        phone: true,
        altPhone: true,
        email: true,
        address: true,
        shippingAddress: true,
        notes: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: {
              where: { deletedAt: null },
            },
            invoices: true,
          },
        },
      },
    }),
  ]);

  return {
    buyers,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function deleteBuyer(buyerId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "buyers:delete")) {
    throw new Error("Unauthorized: Insufficient permissions to delete buyer");
  }

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
    include: {
      orders: {
        include: { attachments: true },
      },
    },
  });

  if (!buyer) {
    throw new Error("Buyer not found");
  }

  // 1. Delete all Cloudinary images from buyer's orders concurrently
  const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
  const publicIds = buyer.orders.flatMap((ord) =>
    ord.attachments.filter((att) => att.publicId).map((att) => att.publicId)
  );
  if (publicIds.length > 0) {
    await Promise.allSettled(publicIds.map((pid) => deleteCloudinaryImage(pid)));
  }

  // 2. Cascade delete all relational database records referencing this buyer
  await prisma.$transaction(async (tx) => {
    const orderIds = buyer.orders.map((o) => o.id);

    // Delete attachments, items, and invoice join rows for buyer's orders
    if (orderIds.length > 0) {
      await tx.orderAttachment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.invoiceOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    }

    // Delete buyer's invoices
    await tx.invoiceOrder.deleteMany({
      where: { invoice: { buyerId } },
    });
    await tx.invoice.deleteMany({ where: { buyerId } });

    // Delete buyer's payments and ledger entries
    await tx.buyerLedgerEntry.deleteMany({ where: { buyerId } });
    await tx.payment.deleteMany({ where: { buyerId } });

    // Delete buyer's orders
    await tx.order.deleteMany({ where: { buyerId } });

    // Finally delete the buyer record
    await tx.buyer.delete({ where: { id: buyerId } });
  });

  await logAuditEvent({
    userId: user.id,
    action: "BUYER_DELETED",
    module: "BUYERS",
    recordId: buyerId,
    details: { companyName: buyer.companyName, ordersDeleted: buyer.orders.length },
  });

  revalidatePath("/buyers");
  revalidatePath("/");
  return { success: true };
}

export async function getBuyerProfile(buyerId: string, ledgerPage = 1, ledgerPageSize = 20) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "buyers:view")) {
    throw new Error("Unauthorized");
  }

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
    include: {
      orders: {
        where: { deletedAt: null },
        orderBy: { orderDate: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          challanNumber: true,
          orderDate: true,
          status: true,
          totalAmount: true,
          isArchived: true,
        },
      },
      invoices: {
        orderBy: { invoiceDate: "desc" },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          grandTotal: true,
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 10,
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          amount: true,
          paymentMethod: true,
          referenceNo: true,
        },
      },
    },
  });

  if (!buyer) {
    throw new Error("Buyer not found");
  }

  // Calculate lifetime financial position using SQL aggregation for efficiency
  const [receivablesAgg, paymentsAgg] = await Promise.all([
    prisma.buyerLedgerEntry.aggregate({
      where: { buyerId },
      _sum: { debitAmount: true },
    }),
    prisma.buyerLedgerEntry.aggregate({
      where: { buyerId },
      _sum: { creditAmount: true },
    }),
  ]);

  const totalReceivable = Number(receivablesAgg._sum.debitAmount || 0);
  const totalPaid = Number(paymentsAgg._sum.creditAmount || 0);
  const netDue = totalReceivable - totalPaid;

  // Paginated Ledger entries
  const ledgerSkip = (Math.max(1, ledgerPage) - 1) * ledgerPageSize;
  const [totalLedgerEntries, ledgerEntries] = await Promise.all([
    prisma.buyerLedgerEntry.count({ where: { buyerId } }),
    prisma.buyerLedgerEntry.findMany({
      where: { buyerId },
      skip: ledgerSkip,
      take: ledgerPageSize,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return {
    buyer,
    stats: {
      totalReceivable,
      totalPaid,
      netDue,
      ordersCount: buyer.orders.length,
    },
    ledger: {
      entries: ledgerEntries,
      pagination: {
        total: totalLedgerEntries,
        page: ledgerPage,
        pageSize: ledgerPageSize,
        totalPages: Math.ceil(totalLedgerEntries / ledgerPageSize),
      },
    },
  };
}

export async function createBuyer(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "buyers:create")) {
    throw new Error("Unauthorized: Insufficient permissions to create buyer");
  }

  const validated = CreateBuyerSchema.parse(input);

  const existing = await prisma.buyer.findUnique({
    where: { companyName: validated.companyName.trim() },
  });

  if (existing) {
    throw new Error(`A buyer with company name "${validated.companyName}" already exists`);
  }

  const buyer = await prisma.buyer.create({
    data: {
      companyName: validated.companyName.trim(),
      contactPerson: validated.contactPerson.trim(),
      phone: validated.phone.trim(),
      altPhone: validated.altPhone?.trim() || null,
      email: validated.email?.trim() || null,
      address: validated.address.trim(),
      shippingAddress: validated.shippingAddress?.trim() || null,
      notes: validated.notes?.trim() || null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "BUYER_CREATED",
    module: "BUYERS",
    recordId: buyer.id,
    details: { companyName: buyer.companyName, phone: buyer.phone },
  });

  revalidatePath("/buyers");
  return { success: true, buyer };
}

export async function updateBuyer(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "buyers:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to edit buyer");
  }

  const validated = UpdateBuyerSchema.parse(input);

  const buyer = await prisma.buyer.update({
    where: { id: validated.id },
    data: {
      companyName: validated.companyName?.trim(),
      contactPerson: validated.contactPerson?.trim(),
      phone: validated.phone?.trim(),
      altPhone: validated.altPhone?.trim() || null,
      email: validated.email?.trim() || null,
      address: validated.address?.trim(),
      shippingAddress: validated.shippingAddress?.trim() || null,
      notes: validated.notes?.trim() || null,
      isActive: validated.isActive,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "BUYER_UPDATED",
    module: "BUYERS",
    recordId: buyer.id,
    details: validated,
  });

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyer.id}`);
  return { success: true, buyer };
}
