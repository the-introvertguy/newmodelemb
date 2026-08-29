"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { RecordPaymentSchema, CreateExpenseSchema, CreateExpenseCategorySchema } from "@/schemas";
import { LedgerEntryType, PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calculateNextRunningBalance } from "@/services/ledger.service";

/**
 * Generates sequential Payment Number in format PAY-YYYY-0001
 */
async function generateNextPaymentNumber(paymentDate: Date): Promise<string> {
  const year = paymentDate.getFullYear();
  const prefix = `PAY-${year}-`;

  const latest = await prisma.payment.findFirst({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      paymentNumber: "desc",
    },
    select: {
      paymentNumber: true,
    },
  });

  let nextSeq = 1;
  if (latest?.paymentNumber) {
    const parts = latest.paymentNumber.split("-");
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export interface GetAccountsTransactionsParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  type?: "ALL" | "PAYMENT" | "EXPENSE";
}

/**
 * Unified Accounts Log: Combines Payments Received (Income) and Expenses (Outflow)
 */
export async function getUnifiedAccounts({
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
  type = "ALL",
}: GetAccountsTransactionsParams = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "accounts:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view accounts");
  }

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Aggregate totals for KPI summary
  const [paymentsAgg, expensesAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: hasDateFilter ? { paymentDate: dateFilter } : {},
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: hasDateFilter ? { date: dateFilter } : {},
      _sum: { amount: true },
    }),
  ]);

  const totalPayments = Number(paymentsAgg._sum.amount || 0);
  const totalExpenses = Number(expensesAgg._sum.amount || 0);
  const netCashFlow = totalPayments - totalExpenses;

  // Fetch recent payments and expenses
  const [payments, expenses, totalPaymentsCount, totalExpensesCount] = await Promise.all([
    type === "EXPENSE"
      ? []
      : prisma.payment.findMany({
          where: hasDateFilter ? { paymentDate: dateFilter } : {},
          take: pageSize,
          orderBy: { paymentDate: "desc" },
          include: {
            buyer: {
              select: {
                id: true,
                companyName: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
    type === "PAYMENT"
      ? []
      : prisma.expense.findMany({
          where: hasDateFilter ? { date: dateFilter } : {},
          take: pageSize,
          orderBy: { date: "desc" },
          include: {
            category: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
    prisma.payment.count({ where: hasDateFilter ? { paymentDate: dateFilter } : {} }),
    prisma.expense.count({ where: hasDateFilter ? { date: dateFilter } : {} }),
  ]);

  return {
    stats: {
      totalPayments,
      totalExpenses,
      netCashFlow,
      paymentsCount: totalPaymentsCount,
      expensesCount: totalExpensesCount,
    },
    payments,
    expenses,
    pagination: {
      page,
      pageSize,
      total: totalPaymentsCount + totalExpensesCount,
      totalPages: Math.ceil((totalPaymentsCount + totalExpensesCount) / pageSize),
    },
  };
}

/**
 * Overall Factory-Wide Consolidated Buyer Ledger Log
 */
export async function getOverallLedger({
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
  buyerId,
}: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  buyerId?: string;
} = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "ledger:view_overall")) {
    throw new Error("Unauthorized: Insufficient permissions to view overall ledger");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const where: any = {};

  if (buyerId) {
    where.buyerId = buyerId;
  }

  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) where.entryDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.entryDate.lte = end;
    }
  }

  const [total, entries, totalsAgg] = await Promise.all([
    prisma.buyerLedgerEntry.count({ where }),
    prisma.buyerLedgerEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    }),
    prisma.buyerLedgerEntry.aggregate({
      where,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    }),
  ]);

  const totalDebit = Number(totalsAgg._sum.debitAmount || 0);
  const totalCredit = Number(totalsAgg._sum.creditAmount || 0);

  return {
    entries,
    stats: {
      totalDebit,
      totalCredit,
      netOutstanding: totalDebit - totalCredit,
    },
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Record a Buyer Payment received and atomically sync with the Buyer Ledger
 */
export async function recordPayment(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "payments:create")) {
    throw new Error("Unauthorized: Insufficient permissions to record payment");
  }

  const validated = RecordPaymentSchema.parse(input);
  const paymentNumber = await generateNextPaymentNumber(validated.paymentDate);

  const payment = await prisma.$transaction(async (tx) => {
    // 1. Create payment record
    const p = await tx.payment.create({
      data: {
        paymentNumber,
        buyerId: validated.buyerId,
        paymentDate: validated.paymentDate,
        amount: validated.amount,
        paymentMethod: validated.paymentMethod as PaymentMethod,
        referenceNo: validated.referenceNo?.trim() || null,
        notes: validated.notes?.trim() || null,
        createdById: user.id,
      },
      include: {
        buyer: true,
      },
    });

    // 2. Fetch last running balance for this buyer
    const lastEntry = await tx.buyerLedgerEntry.findFirst({
      where: { buyerId: validated.buyerId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });

    const prevBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
    const newRunningBalance = calculateNextRunningBalance(prevBalance, {
      creditAmount: validated.amount,
    });

    // 3. Record payment credit entry in buyer ledger
    await tx.buyerLedgerEntry.create({
      data: {
        buyerId: validated.buyerId,
        entryDate: validated.paymentDate,
        entryType: LedgerEntryType.PAYMENT_RECEIVED,
        referenceNumber: paymentNumber,
        description: `Payment Received (${validated.paymentMethod}${
          validated.referenceNo ? ` - Ref: ${validated.referenceNo}` : ""
        })`,
        debitAmount: 0,
        creditAmount: validated.amount,
        runningBalance: newRunningBalance,
      },
    });

    return p;
  });

  await logAuditEvent({
    userId: user.id,
    action: "PAYMENT_RECORDED",
    module: "ACCOUNTS",
    recordId: payment.id,
    details: {
      paymentNumber: payment.paymentNumber,
      buyerId: payment.buyerId,
      amount: payment.amount,
      method: payment.paymentMethod,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/ledger");
  revalidatePath(`/buyers/${validated.buyerId}`);
  return { success: true, payment };
}

/**
 * Record a Factory Expense
 */
export async function createExpense(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "expenses:create")) {
    throw new Error("Unauthorized: Insufficient permissions to add expense");
  }

  const validated = CreateExpenseSchema.parse(input);

  const expense = await prisma.expense.create({
    data: {
      date: validated.date,
      categoryId: validated.categoryId,
      amount: validated.amount,
      description: validated.description.trim(),
      voucherNo: validated.voucherNo?.trim() || null,
      createdById: user.id,
    },
    include: {
      category: true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "EXPENSE_ADDED",
    module: "ACCOUNTS",
    recordId: expense.id,
    details: {
      category: expense.category.name,
      amount: expense.amount,
      description: expense.description,
    },
  });

  revalidatePath("/accounts");
  return { success: true, expense };
}

export async function deleteExpense(id: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "expenses:delete")) {
    throw new Error("Unauthorized: Insufficient permissions to delete expense");
  }

  const expense = await prisma.expense.delete({
    where: { id },
  });

  await logAuditEvent({
    userId: user.id,
    action: "EXPENSE_DELETED",
    module: "ACCOUNTS",
    recordId: id,
    details: { amount: expense.amount, description: expense.description },
  });

  revalidatePath("/accounts");
  return { success: true };
}
