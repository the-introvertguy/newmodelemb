"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export type DatePreset = "TODAY" | "LAST_7_DAYS" | "THIS_WEEK" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

function getDateRangeForPreset(preset: DatePreset, customStart?: string, customEnd?: string) {
  const now = new Date();

  switch (preset) {
    case "TODAY":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "LAST_7_DAYS":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "THIS_WEEK":
      return { start: startOfWeek(now, { weekStartsOn: 6 }), end: endOfWeek(now, { weekStartsOn: 6 }) }; // Week starts on Saturday for Bangladesh
    case "LAST_30_DAYS":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "THIS_MONTH":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "CUSTOM":
      return {
        start: customStart ? startOfDay(new Date(customStart)) : startOfMonth(now),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function getComprehensiveReport(
  preset: DatePreset = "THIS_MONTH",
  customStart?: string,
  customEnd?: string
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reports:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view reports");
  }

  const { start, end } = getDateRangeForPreset(preset, customStart, customEnd);

  // 1. Orders Report
  const [ordersSummary, ordersByStatus, totalDeliveredItemsAgg] = await Promise.all([
    prisma.order.aggregate({
      where: {
        orderDate: { gte: start, lte: end },
        deletedAt: null,
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: {
        orderDate: { gte: start, lte: end },
        deletedAt: null,
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          orderDate: { gte: start, lte: end },
          deletedAt: null,
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  // 2. Financial Accounts Report (Payments vs Expenses)
  const [paymentsAgg, expensesAgg, expensesByCategory] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        date: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Map category names
  const categoryIds = expensesByCategory.map((e) => e.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const categoryBreakdown = expensesByCategory.map((item) => ({
    categoryId: item.categoryId,
    name: categoryMap.get(item.categoryId) || "Uncategorized",
    amount: Number(item._sum.amount || 0),
    count: item._count.id,
  }));

  // 3. Buyer Outstanding Dues Summary (Factory wide)
  const [totalDebitsAgg, totalCreditsAgg] = await Promise.all([
    prisma.buyerLedgerEntry.aggregate({
      _sum: { debitAmount: true },
    }),
    prisma.buyerLedgerEntry.aggregate({
      _sum: { creditAmount: true },
    }),
  ]);

  const totalLifetimeReceivables = Number(totalDebitsAgg._sum.debitAmount || 0);
  const totalLifetimeCollected = Number(totalCreditsAgg._sum.creditAmount || 0);
  const totalLifetimeNetDue = totalLifetimeReceivables - totalLifetimeCollected;

  // 4. Employee Payroll Report for Date Range
  const [advancesAgg, bonusesAgg, settlementsAgg] = await Promise.all([
    prisma.salaryAdvance.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.employeeBonus.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.salaryPayment.aggregate({
      where: { paymentDate: { gte: start, lte: end } },
      _sum: { netPaidAmount: true, baseSalary: true },
      _count: { id: true },
    }),
  ]);

  return {
    period: {
      preset,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    orders: {
      totalCount: ordersSummary._count.id,
      totalAmount: Number(ordersSummary._sum.totalAmount || 0),
      totalQuantity: Number(totalDeliveredItemsAgg._sum.quantity || 0),
      byStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        amount: Number(s._sum.totalAmount || 0),
      })),
    },
    financials: {
      paymentsReceived: Number(paymentsAgg._sum.amount || 0),
      paymentsCount: paymentsAgg._count.id,
      expensesTotal: Number(expensesAgg._sum.amount || 0),
      expensesCount: expensesAgg._count.id,
      netCashMovement: Number(paymentsAgg._sum.amount || 0) - Number(expensesAgg._sum.amount || 0),
      expenseCategoryBreakdown: categoryBreakdown,
    },
    dues: {
      lifetimeReceivables: totalLifetimeReceivables,
      lifetimeCollected: totalLifetimeCollected,
      lifetimeOutstandingDue: totalLifetimeNetDue,
    },
    payroll: {
      advancesDisbursed: Number(advancesAgg._sum.amount || 0),
      bonusesAwarded: Number(bonusesAgg._sum.amount || 0),
      netSalariesPaid: Number(settlementsAgg._sum.netPaidAmount || 0),
      settlementsCount: settlementsAgg._count.id,
    },
  };
}
