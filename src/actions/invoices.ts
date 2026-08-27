"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { CreateInvoiceSchema, UpdateInvoiceSchema } from "@/schemas";
import { numberToWordsTaka } from "@/lib/utils";
import { revalidatePath } from "next/cache";

/**
 * Generates sequential Bill Number in format YYYY-00001 (e.g. 2026-00001)
 */
async function generateNextInvoiceNumber(invoiceDate: Date): Promise<string> {
  const year = invoiceDate.getFullYear();
  const prefix = `${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextSeq = 1;
  if (latest?.invoiceNumber) {
    const parts = latest.invoiceNumber.split("-");
    if (parts.length === 2) {
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

export interface GetInvoicesParams {
  page?: number;
  pageSize?: number;
  buyerId?: string;
  search?: string;
}

export async function getInvoices({
  page = 1,
  pageSize = 20,
  buyerId,
  search = "",
}: GetInvoicesParams = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view invoices");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const where: any = {};

  if (buyerId) {
    where.buyerId = buyerId;
  }

  if (search.trim()) {
    where.OR = [
      { invoiceNumber: { contains: search.trim(), mode: "insensitive" } },
      { buyer: { companyName: { contains: search.trim(), mode: "insensitive" } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { invoiceDate: "desc" },
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            address: true,
          },
        },
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                challanNumber: true,
                orderDate: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getInvoiceById(id: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:view")) {
    throw new Error("Unauthorized");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      buyer: true,
      orders: {
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Fetch factory company settings for header details
  const settings = await prisma.companySetting.findFirst();

  return {
    invoice,
    settings: settings || {
      companyName: "New Model Embroidery",
      subtitle: "( A Computerized Embroidery Project )",
      address:
        "South Azampur, House 23, R-1, Block-A, Jalal Ahmed Soroni Road, Dhakhin Khan, Dhaka-1230",
      phones: "01731-992361, 01971-992361, 0013472992519",
      email: "newmodelemb@gmail.com",
      proprietorName: "Radwen Hossain",
      currencySymbol: "৳",
    },
  };
}

/**
 * Returns all eligible orders for a buyer that can be bundled into an invoice
 */
export async function getEligibleOrdersForInvoice(buyerId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:create")) {
    throw new Error("Unauthorized");
  }

  const orders = await prisma.order.findMany({
    where: {
      buyerId,
      deletedAt: null,
    },
    orderBy: { orderDate: "desc" },
    include: {
      items: true,
    },
  });

  return orders;
}

export async function createInvoice(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:create")) {
    throw new Error("Unauthorized: Insufficient permissions to generate invoice");
  }

  const validated = CreateInvoiceSchema.parse(input);

  // 1. Verify all selected orders belong to the SAME buyer
  const orders = await prisma.order.findMany({
    where: {
      id: { in: validated.orderIds },
      deletedAt: null,
    },
    include: {
      items: true,
    },
  });

  if (orders.length !== validated.orderIds.length) {
    throw new Error("One or more selected orders could not be found");
  }

  const invalidBuyerOrder = orders.find((o) => o.buyerId !== validated.buyerId);
  if (invalidBuyerOrder) {
    throw new Error("All orders included in a bill MUST belong to the same buyer");
  }

  // 2. Compute subtotal from all items in selected orders
  let subtotal = 0;
  for (const order of orders) {
    for (const item of order.items) {
      subtotal += Number(item.totalPrice);
    }
  }

  const discount = Number(validated.discount || 0);
  const advanceReceived = Number(validated.advanceReceived || 0);
  const grandTotal = Math.max(0, subtotal - discount - advanceReceived);
  const inWords = numberToWordsTaka(grandTotal);

  const invoiceNumber = await generateNextInvoiceNumber(validated.invoiceDate);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        referenceNote: validated.referenceNote?.trim() || null,
        buyerId: validated.buyerId,
        invoiceDate: validated.invoiceDate,
        subject: validated.subject || "Bill for Embroidery orders.",
        salutationText:
          validated.salutationText ||
          "Dear Sir,\nWe are pleased to submit the bill of Embroidery work which done by us. We will be highly Grateful to you if you could make the payments at your earliest.",
        subtotal,
        discount,
        advanceReceived,
        grandTotal,
        inWords,
        proprietorName: "Radwen Hossain",
        notes: validated.notes?.trim() || null,
        createdById: user.id,
        orders: {
          create: validated.orderIds.map((orderId) => ({
            orderId,
          })),
        },
      },
      include: {
        orders: true,
        buyer: true,
      },
    });

    return inv;
  });

  await logAuditEvent({
    userId: user.id,
    action: "INVOICE_GENERATED",
    module: "INVOICES",
    recordId: invoice.id,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      buyerId: invoice.buyerId,
      grandTotal,
      ordersCount: validated.orderIds.length,
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/buyers/${validated.buyerId}`);
  return { success: true, invoice };
}

export async function updateInvoice(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to edit invoice");
  }

  const validated = UpdateInvoiceSchema.parse(input);

  const current = await prisma.invoice.findUnique({
    where: { id: validated.id },
  });

  if (!current) {
    throw new Error("Invoice not found");
  }

  const discount = validated.discount !== undefined ? Number(validated.discount) : Number(current.discount);
  const advanceReceived =
    validated.advanceReceived !== undefined
      ? Number(validated.advanceReceived)
      : Number(current.advanceReceived);
  const subtotal = Number(current.subtotal);
  const grandTotal = Math.max(0, subtotal - discount - advanceReceived);
  const inWords = numberToWordsTaka(grandTotal);

  const updated = await prisma.invoice.update({
    where: { id: validated.id },
    data: {
      referenceNote: validated.referenceNote !== undefined ? validated.referenceNote : current.referenceNote,
      invoiceDate: validated.invoiceDate || current.invoiceDate,
      subject: validated.subject || current.subject,
      salutationText: validated.salutationText !== undefined ? validated.salutationText : current.salutationText,
      discount,
      advanceReceived,
      grandTotal,
      inWords,
      notes: validated.notes !== undefined ? validated.notes : current.notes,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "INVOICE_UPDATED",
    module: "INVOICES",
    recordId: updated.id,
    details: { invoiceNumber: updated.invoiceNumber, grandTotal },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${updated.id}`);
  return { success: true, invoice: updated };
}

export async function deleteInvoice(id: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "invoices:delete")) {
    throw new Error("Unauthorized: Insufficient permissions to delete invoice");
  }

  await prisma.invoice.delete({
    where: { id },
  });

  await logAuditEvent({
    userId: user.id,
    action: "INVOICE_DELETED",
    module: "INVOICES",
    recordId: id,
    details: { id },
  });

  revalidatePath("/invoices");
  return { success: true };
}
