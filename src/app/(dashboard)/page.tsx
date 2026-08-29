import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardViewClient } from "@/components/dashboard/dashboard-view-client";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

  try {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all KPI counters, recent orders, and trends concurrently
    // Batch 1: Key Aggregates & Counts (Sequential batch to conserve DB connections)
    const [activeOrdersCount, totalReceivableAgg, totalPaymentsAgg, totalPiecesAgg] =
      await Promise.all([
        prisma.order.count({
          where: {
            isArchived: false,
            deletedAt: null,
            status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
          },
        }),
        prisma.buyerLedgerEntry.aggregate({
          _sum: { debitAmount: true },
        }),
        prisma.buyerLedgerEntry.aggregate({
          _sum: { creditAmount: true },
        }),
        prisma.orderItem.aggregate({
          _sum: { quantity: true },
        }),
      ]);

    // Batch 2: Order status breakdown & recent lists
    const [ordersByStatus, recentOrders, allUpcomingOrders] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: { deletedAt: null, isArchived: false },
        _count: { id: true },
      }),
      prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { orderDate: "desc" },
        take: 6,
        include: {
          buyer: true,
          items: true,
        },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          expectedDeliveryDate: { not: null },
        },
        include: { buyer: true },
      }),
    ]);

    // Batch 3: 6-Month historical trend data
    const [allOrdersLast6Months, allPaymentsLast6Months] = await Promise.all([
      prisma.order.findMany({
        where: {
          deletedAt: null,
          orderDate: { gte: sixMonthsAgo },
        },
        select: {
          orderDate: true,
          totalAmount: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: sixMonthsAgo },
        },
        select: {
          paymentDate: true,
          amount: true,
        },
      }),
    ]);

    const totalReceivable = Number(totalReceivableAgg._sum.debitAmount || 0);
    const totalPayments = Number(totalPaymentsAgg._sum.creditAmount || 0);
    const totalPiecesProduced = Number(totalPiecesAgg._sum.quantity || 0);

    // Compute 6-month trend data
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyTrendData: Array<{ month: string; orders: number; payments: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;

      const ordersSum = allOrdersLast6Months
        .filter((o) => {
          const od = new Date(o.orderDate);
          return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
        })
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      const paymentsSum = allPaymentsLast6Months
        .filter((p) => {
          const pd = new Date(p.paymentDate);
          return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      monthlyTrendData.push({
        month: monthKey,
        orders: ordersSum,
        payments: paymentsSum,
      });
    }

    const formattedStatusCounts = ordersByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    return (
      <DashboardViewClient
        kpis={{
          activeOrdersCount,
          totalReceivable,
          totalPayments,
          totalPiecesProduced,
        }}
        ordersByStatus={formattedStatusCounts}
        monthlyTrendData={monthlyTrendData}
        recentOrders={recentOrders}
        allUpcomingOrders={allUpcomingOrders}
      />
    );
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    return (
      <DashboardViewClient
        kpis={{
          activeOrdersCount: 0,
          totalReceivable: 0,
          totalPayments: 0,
          totalPiecesProduced: 0,
        }}
        ordersByStatus={[]}
        monthlyTrendData={[]}
        recentOrders={[]}
        allUpcomingOrders={[]}
      />
    );
  }
}
