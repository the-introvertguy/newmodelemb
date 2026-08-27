"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Box,
  Coins,
  Receipt,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Layers,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  PRODUCT_RECEIVED: "#0284c7",
  IN_PRODUCTION: "#7c3aed",
  COMPLETED: "#059669",
  READY_FOR_DELIVERY: "#16a34a",
  DELIVERED: "#164e3f",
  ON_HOLD: "#d97706",
  CANCELLED: "#e11d48",
};

export function DashboardViewClient({
  kpis,
  ordersByStatus,
  monthlyTrendData,
  recentOrders,
  allUpcomingOrders,
}: {
  kpis: {
    activeOrdersCount: number;
    totalReceivable: number;
    totalPayments: number;
    totalPiecesProduced: number;
  };
  ordersByStatus: Array<{ status: string; count: number }>;
  monthlyTrendData: Array<{ month: string; orders: number; payments: number }>;
  recentOrders: any[];
  allUpcomingOrders: any[];
}) {
  // Calendar state for month navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find deliveries in this viewed month
  const monthDeliveries = allUpcomingOrders.filter((ord) => {
    if (!ord.expectedDeliveryDate) return false;
    const d = new Date(ord.expectedDeliveryDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const deliveryDaysSet = new Set(
    monthDeliveries.map((ord) => new Date(ord.expectedDeliveryDate).getDate())
  );

  const statusPieData = ordersByStatus.map((s) => ({
    name: s.status.replace(/_/g, " "),
    value: s.count,
    color: STATUS_COLORS[s.status] || "#64748b",
  }));

  return (
    <div className="space-y-8">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Factory Overview</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Operational dashboard & cash metrics · {formatDate(new Date(), "d MMMM yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>+ New Order</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards (4 clean columns with refined visual weight) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Orders */}
        <div className="bg-[#164e3f] text-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-34 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase opacity-85">
              Active Orders
            </span>
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-emerald-200" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {kpis.activeOrdersCount}
            </p>
            <span className="text-[11px] opacity-75 font-medium">In active production pipeline</span>
          </div>
        </div>

        {/* Total Receivables */}
        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-34 group">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400">
              Total Receivables
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              ৳ {kpis.totalReceivable.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-slate-500 font-medium">Cumulative order receivables</span>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-34 group">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400">
              Payments Collected
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-800 tabular-nums tracking-tight">
              ৳ {kpis.totalPayments.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-emerald-700 font-medium">Total payments received</span>
          </div>
        </div>

        {/* Production Volume */}
        <div className="bg-[#FAF8F5] border border-[#ede8e1] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-34 group">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-600">
              Production Volume
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-200/70 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-slate-700" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              {kpis.totalPiecesProduced.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-normal text-slate-500">pcs</span>
            </p>
            <span className="text-[11px] text-slate-500 font-medium">Embroidery pieces manufactured</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Graphs (Revenue/Cash Flow Trend & Order Status Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Trend Area & Bar Graph (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-[#ede8e1] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block">
                Financial & Volume Trends
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Monthly Orders vs. Payments Received
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#164e3f]" />
                <span className="text-slate-600 font-medium">Orders (৳)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-600 font-medium">Payments (৳)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`৳ ${Number(val).toLocaleString("en-IN")}`, ""]}
                  contentStyle={{
                    backgroundColor: "#FAF8F5",
                    borderRadius: "14px",
                    borderColor: "#ede8e1",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                />
                <Bar dataKey="orders" fill="#164e3f" radius={[6, 6, 0, 0]} name="Orders" />
                <Bar dataKey="payments" fill="#34d399" radius={[6, 6, 0, 0]} name="Payments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut Chart (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-[#ede8e1] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block">
              Order Status Breakdown
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {ordersByStatus.reduce((s, i) => s + i.count, 0)} Total
            </span>
          </div>

          <div className="h-44 w-full flex items-center justify-center min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [val, "Orders"]}
                  contentStyle={{
                    backgroundColor: "#FAF8F5",
                    borderRadius: "12px",
                    borderColor: "#ede8e1",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ede8e1] text-[11px]">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between pr-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Delivery Calendar with Month Nav & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Delivery Calendar (col-span-6) with Month Navigation */}
        <div className="lg:col-span-6 bg-white border border-[#ede8e1] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#164e3f]/10 flex items-center justify-center text-[#164e3f]">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delivery Calendar</h3>
            </div>

            {/* Month Navigation Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-[#FAF8F5] p-1 rounded-2xl border border-[#ede8e1] w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-900 px-2 min-w-28 text-center flex-1 sm:flex-initial">
                {formatDate(currentDate, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Day Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-[10px] font-semibold text-slate-400 uppercase py-1">
                {day}
              </span>
            ))}

            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const hasDelivery = deliveryDaysSet.has(dayNum);
              const isToday =
                dayNum === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`h-8 flex flex-col items-center justify-center rounded-xl text-xs font-medium relative transition-colors ${
                    isToday
                      ? "border-2 border-[#164e3f] font-bold text-[#164e3f] bg-emerald-50/50"
                      : hasDelivery
                      ? "bg-emerald-50 text-emerald-900 font-bold"
                      : "text-slate-700 hover:bg-[#FAF8F5]"
                  }`}
                >
                  <span className="tabular-nums">{dayNum}</span>
                  {hasDelivery && (
                    <span className="w-1.5 h-1.5 bg-[#164e3f] rounded-full absolute bottom-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Month's Scheduled Deliveries */}
          <div className="pt-3 border-t border-[#ede8e1] space-y-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block">
              Deliveries in {formatDate(currentDate, "MMMM yyyy")} ({monthDeliveries.length})
            </span>

            {monthDeliveries.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No deliveries scheduled for this month.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {monthDeliveries.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#ede8e1] hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#164e3f]" />
                      <Link
                        href={`/orders/${ord.id}`}
                        className="font-bold text-slate-900 hover:underline"
                      >
                        {ord.orderNumber}
                      </Link>
                      <span className="text-slate-500 truncate max-w-[150px]">· {ord.buyer?.companyName}</span>
                    </div>
                    <span className="text-emerald-800 font-bold font-mono text-[11px]">
                      {formatDate(ord.expectedDeliveryDate, "d MMM")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders List (col-span-6) */}
        <div className="lg:col-span-6 bg-white border border-[#ede8e1] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Orders</h3>
            <Link
              href="/orders"
              className="text-xs text-[#164e3f] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentOrders.map((ord) => {
              const totalPieces = ord.items.reduce((s: number, i: any) => s + Number(i.quantity), 0);
              return (
                <div
                  key={ord.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#ede8e1] hover:bg-slate-100/60 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <Link
                      href={`/orders/${ord.id}`}
                      className="font-bold text-slate-900 text-xs hover:underline text-[#164e3f]"
                    >
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-slate-500 truncate">{ord.buyer?.companyName}</p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs text-slate-700 font-semibold tabular-nums">{totalPieces} pcs</span>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full ring-1 ring-inset ring-current/10"
                      style={{
                        backgroundColor: `${STATUS_COLORS[ord.status]}15`,
                        color: STATUS_COLORS[ord.status] || "#1e293b",
                      }}
                    >
                      {ord.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
