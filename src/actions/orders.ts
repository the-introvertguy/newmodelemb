"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  ArchiveOrderSchema,
  AttachOrderImageSchema,
} from "@/schemas";
import { OrderStatus, LedgerEntryType } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Generates the next sequential Order Number in format YYYYMM0001 (e.g. 2026080001)
 */
async function generateNextOrderNumber(orderDate: Date): Promise<string> {
  const year = orderDate.getFullYear();
  const month = String(orderDate.getMonth() + 1).padStart(2, "0");
  const prefix = `${year}${month}`;

  // Find the highest sequence for this year-month prefix
  const latestOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  let nextSeq = 1;
  if (latestOrder?.orderNumber && latestOrder.orderNumber.length >= 10) {
    const currentSeqStr = latestOrder.orderNumber.substring(6);
    const currentSeq = parseInt(currentSeqStr, 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus;
  buyerId?: string;
  isArchived?: boolean;
  startDate?: string;
  endDate?: string;
}

export async function getOrders({
  page = 1,
  pageSize = 20,
  search = "",
  status,
  buyerId,
  isArchived = false,
  startDate,
  endDate,
}: GetOrdersParams = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view orders");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const where: any = {
    deletedAt: null,
    isArchived,
  };

  if (status) {
    where.status = status;
  }

  if (buyerId) {
    where.buyerId = buyerId;
  }

  if (startDate || endDate) {
    where.orderDate = {};
    if (startDate) where.orderDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.orderDate.lte = end;
    }
  }

  if (search.trim()) {
    const s = search.trim();
    where.OR = [
      { orderNumber: { contains: s, mode: "insensitive" } },
      { challanNumber: { contains: s, mode: "insensitive" } },
      { buyer: { companyName: { contains: s, mode: "insensitive" } } },
      {
        items: {
          some: {
            OR: [
              { designReference: { contains: s, mode: "insensitive" } },
              { styleRef: { contains: s, mode: "insensitive" } },
              { productType: { contains: s, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { orderDate: "desc" },
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
            phone: true,
          },
        },
        items: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getOrderById(orderId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:view")) {
    throw new Error("Unauthorized");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      items: true,
      attachments: {
        orderBy: { uploadedAt: "desc" },
      },
      invoiceOrders: {
        include: {
          invoice: true,
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

  if (!order || order.deletedAt) {
    throw new Error("Order not found");
  }

  return order;
}

export async function createOrder(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:create")) {
    throw new Error("Unauthorized: Insufficient permissions to create order");
  }

  const validated = CreateOrderSchema.parse(input);
  
  let orderNumber = validated.orderNumber?.trim();
  if (orderNumber) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });
    if (existing && !existing.deletedAt) {
      throw new Error(`Order number "${orderNumber}" already exists. Please choose a unique order number.`);
    }
  } else {
    orderNumber = await generateNextOrderNumber(validated.orderDate);
  }

  // Compute item totals and order grand total
  const itemsWithTotals = validated.items.map((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const totalPrice = qty * price;
    return {
      productType: item.productType.trim(),
      styleRef: item.styleRef?.trim() || "—",
      designReference: item.designReference.trim(),
      quantity: qty,
      unitPrice: price,
      totalPrice,
      notes: item.notes?.trim() || null,
    };
  });

  const grandTotal = itemsWithTotals.reduce((acc, curr) => acc + curr.totalPrice, 0);

  // Atomic database transaction ensuring order, items, and ledger entry are created consistently
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        buyerId: validated.buyerId,
        orderDate: validated.orderDate,
        expectedDeliveryDate: validated.expectedDeliveryDate || null,
        challanNumber: validated.challanNumber?.trim() || null,
        status: validated.status as OrderStatus,
        totalAmount: grandTotal,
        notes: validated.notes?.trim() || null,
        createdById: user.id,
        items: {
          create: itemsWithTotals,
        },
      },
      include: {
        items: true,
        buyer: true,
      },
    });

    // 2. Compute current running balance for buyer
    const lastEntry = await tx.buyerLedgerEntry.findFirst({
      where: { buyerId: validated.buyerId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });

    const previousBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
    const newRunningBalance = previousBalance + grandTotal;

    // 3. Record order receivable in Buyer Ledger
    await tx.buyerLedgerEntry.create({
      data: {
        buyerId: validated.buyerId,
        entryDate: validated.orderDate,
        entryType: LedgerEntryType.RECEIVABLE_ORDER,
        referenceNumber: orderNumber,
        description: `Order Created (${order.items.length} line items)`,
        debitAmount: grandTotal,
        creditAmount: 0,
        runningBalance: newRunningBalance,
      },
    });

    return order;
  });

  await logAuditEvent({
    userId: user.id,
    action: "ORDER_CREATED",
    module: "ORDERS",
    recordId: result.id,
    details: {
      orderNumber: result.orderNumber,
      buyerId: result.buyerId,
      totalAmount: grandTotal,
      itemsCount: result.items.length,
      challanNumber: result.challanNumber,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/accounts");
  revalidatePath(`/buyers/${validated.buyerId}`);
  return { success: true, order: result };
}

export async function updateOrderStatus(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:status")) {
    throw new Error("Unauthorized: Insufficient permissions to update order status");
  }

  const validated = UpdateOrderStatusSchema.parse(input);

  const order = await prisma.order.update({
    where: { id: validated.orderId },
    data: { status: validated.status as OrderStatus },
  });

  await logAuditEvent({
    userId: user.id,
    action: "ORDER_STATUS_CHANGED",
    module: "ORDERS",
    recordId: order.id,
    details: { orderNumber: order.orderNumber, newStatus: order.status },
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return { success: true, order };
}

export async function toggleOrderArchive(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:archive")) {
    throw new Error("Unauthorized: Insufficient permissions to archive order");
  }

  const validated = ArchiveOrderSchema.parse(input);

  const order = await prisma.order.update({
    where: { id: validated.orderId },
    data: {
      isArchived: validated.isArchived,
      archivedAt: validated.isArchived ? new Date() : null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: validated.isArchived ? "ORDER_ARCHIVED" : "ORDER_UNARCHIVED",
    module: "ORDERS",
    recordId: order.id,
    details: { orderNumber: order.orderNumber, isArchived: validated.isArchived },
  });

  revalidatePath("/orders");
  revalidatePath("/archive");
  revalidatePath(`/orders/${order.id}`);
  return { success: true, order };
}

export async function attachOrderImage(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to attach images");
  }

  const validated = AttachOrderImageSchema.parse(input);

  const attachment = await prisma.orderAttachment.create({
    data: {
      orderId: validated.orderId,
      imageUrl: validated.imageUrl,
      publicId: validated.publicId,
      category: validated.category as any,
      caption: validated.caption?.trim() || null,
      width: validated.width || null,
      height: validated.height || null,
      bytes: validated.bytes || null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "IMAGE_ATTACHED",
    module: "ORDERS",
    recordId: validated.orderId,
    details: { attachmentId: attachment.id, caption: attachment.caption },
  });

  revalidatePath(`/orders/${validated.orderId}`);
  return { success: true, attachment };
}

export async function deleteOrderAttachment(attachmentId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to delete image");
  }

  const attachment = await prisma.orderAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new Error("Attachment not found");
  }

  if (attachment.publicId) {
    const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
    await deleteCloudinaryImage(attachment.publicId);
  }

  await prisma.orderAttachment.delete({
    where: { id: attachmentId },
  });

  revalidatePath(`/orders/${attachment.orderId}`);
  return { success: true };
}

export async function updateOrderAttachment(attachmentId: string, caption: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to edit attachment");
  }

  const attachment = await prisma.orderAttachment.update({
    where: { id: attachmentId },
    data: { caption: caption.trim() || null },
  });

  await logAuditEvent({
    userId: user.id,
    action: "ATTACHMENT_RENAMED",
    module: "ORDERS",
    recordId: attachment.orderId,
    details: { attachmentId, caption: attachment.caption },
  });

  revalidatePath(`/orders/${attachment.orderId}`);
  return { success: true, attachment };
}

export async function updateOrder(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:edit")) {
    throw new Error("Unauthorized: Insufficient permissions to edit order");
  }

  const { UpdateOrderSchema } = await import("@/schemas");
  const validated = UpdateOrderSchema.parse(input);

  const existingOrder = await prisma.order.findUnique({
    where: { id: validated.id },
    include: { items: true },
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  let grandTotal = Number(existingOrder.totalAmount);
  let itemsToUpdate = existingOrder.items;

  if (validated.items && validated.items.length > 0) {
    const itemsWithTotals = validated.items.map((item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      return {
        productType: item.productType.trim(),
        styleRef: item.styleRef?.trim() || "—",
        designReference: item.designReference.trim(),
        quantity: qty,
        unitPrice: price,
        totalPrice: qty * price,
        notes: item.notes?.trim() || null,
      };
    });

    grandTotal = itemsWithTotals.reduce((sum, i) => sum + i.totalPrice, 0);
    const oldTotal = Number(existingOrder.totalAmount);
    const delta = grandTotal - oldTotal;
    const targetBuyerId = validated.buyerId || existingOrder.buyerId;

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing items and recreate
      await tx.orderItem.deleteMany({
        where: { orderId: validated.id },
      });

      const ord = await tx.order.update({
        where: { id: validated.id },
        data: {
          buyerId: targetBuyerId,
          orderDate: validated.orderDate || existingOrder.orderDate,
          expectedDeliveryDate:
            validated.expectedDeliveryDate !== undefined
              ? validated.expectedDeliveryDate
              : existingOrder.expectedDeliveryDate,
          challanNumber:
            validated.challanNumber !== undefined
              ? validated.challanNumber?.trim() || null
              : existingOrder.challanNumber,
          status: (validated.status as OrderStatus) || existingOrder.status,
          notes:
            validated.notes !== undefined
              ? validated.notes?.trim() || null
              : existingOrder.notes,
          totalAmount: grandTotal,
          items: {
            create: itemsWithTotals,
          },
        },
        include: {
          items: true,
          buyer: true,
        },
      });

      // Synchronize buyer ledger with delta if order total amount changed
      if (Math.abs(delta) > 0.001) {
        const lastEntry = await tx.buyerLedgerEntry.findFirst({
          where: { buyerId: targetBuyerId },
          orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        });

        const prevBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
        const newRunningBalance = prevBalance + delta;

        await tx.buyerLedgerEntry.create({
          data: {
            buyerId: targetBuyerId,
            entryDate: new Date(),
            entryType: LedgerEntryType.ADJUSTMENT,
            referenceNumber: ord.orderNumber,
            description: `Order Total Adjusted (${ord.orderNumber}: ${delta > 0 ? "+" : ""}${delta.toFixed(2)})`,
            debitAmount: delta > 0 ? delta : 0,
            creditAmount: delta < 0 ? Math.abs(delta) : 0,
            runningBalance: newRunningBalance,
          },
        });
      }

      return ord;
    });

    await logAuditEvent({
      userId: user.id,
      action: "ORDER_UPDATED",
      module: "ORDERS",
      recordId: updated.id,
      details: { orderNumber: updated.orderNumber, totalAmount: grandTotal, delta },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${updated.id}`);
    revalidatePath(`/buyers/${updated.buyerId}`);
    revalidatePath("/accounts");
    return { success: true, order: updated };
  } else {
    const updated = await prisma.order.update({
      where: { id: validated.id },
      data: {
        buyerId: validated.buyerId || existingOrder.buyerId,
        orderDate: validated.orderDate || existingOrder.orderDate,
        expectedDeliveryDate:
          validated.expectedDeliveryDate !== undefined
            ? validated.expectedDeliveryDate
            : existingOrder.expectedDeliveryDate,
        challanNumber:
          validated.challanNumber !== undefined
            ? validated.challanNumber?.trim() || null
            : existingOrder.challanNumber,
        status: (validated.status as OrderStatus) || existingOrder.status,
        notes:
          validated.notes !== undefined
            ? validated.notes?.trim() || null
            : existingOrder.notes,
      },
      include: {
        items: true,
        buyer: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "ORDER_UPDATED",
      module: "ORDERS",
      recordId: updated.id,
      details: { orderNumber: updated.orderNumber },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${updated.id}`);
    revalidatePath(`/buyers/${updated.buyerId}`);
    return { success: true, order: updated };
  }
}

export async function deleteOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:delete")) {
    throw new Error("Unauthorized: Insufficient permissions to delete order");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { invoiceOrders: true, attachments: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // 1. Delete all attachments concurrently from Cloudinary storage
  const { deleteCloudinaryImage } = await import("@/lib/cloudinary");
  const deletePromises = order.attachments
    .filter((att) => att.publicId)
    .map((att) => deleteCloudinaryImage(att.publicId));
  await Promise.allSettled(deletePromises);

  // 2. Disconnect invoice join rows, adjust ledger, and soft delete order
  await prisma.$transaction(async (tx) => {
    await tx.orderAttachment.deleteMany({ where: { orderId } });
    await tx.invoiceOrder.deleteMany({ where: { orderId } });
    await tx.order.update({
      where: { id: orderId },
      data: { deletedAt: new Date() },
    });

    // Record adjustment in buyer ledger if order total was > 0
    const orderTotal = Number(order.totalAmount);
    if (orderTotal > 0) {
      const lastEntry = await tx.buyerLedgerEntry.findFirst({
        where: { buyerId: order.buyerId },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      });

      const prevBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
      const newRunningBalance = prevBalance - orderTotal;

      await tx.buyerLedgerEntry.create({
        data: {
          buyerId: order.buyerId,
          entryDate: new Date(),
          entryType: LedgerEntryType.ADJUSTMENT,
          referenceNumber: order.orderNumber,
          description: `Order Deleted / Cancelled (${order.orderNumber})`,
          debitAmount: 0,
          creditAmount: orderTotal,
          runningBalance: newRunningBalance,
        },
      });
    }
  });

  await logAuditEvent({
    userId: user.id,
    action: "ORDER_DELETED",
    module: "ORDERS",
    recordId: orderId,
    details: { orderNumber: order.orderNumber, deletedAttachmentsCount: order.attachments.length },
  });

  revalidatePath("/orders");
  revalidatePath("/archive");
  revalidatePath("/buyers");
  revalidatePath(`/buyers/${order.buyerId}`);
  revalidatePath("/invoices");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}
