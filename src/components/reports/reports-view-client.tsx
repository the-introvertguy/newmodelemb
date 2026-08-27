"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DatePreset } from "@/actions/reports";

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "TODAY" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
];

export function ReportsViewClient({
  initialData,
  initialPreset,
  initialFrom,
  initialTo,
}: {
  initialData: any;
  initialPreset: DatePreset;
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<"Orders" | "Buyers" | "Accounts" | "Employees">(
    "Accounts"
  );
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(initialPreset);
  const [from, setFrom] = useState(
    initialFrom || initialData.period.start.slice(0, 10)
  );
  const [to, setTo] = useState(
    initialTo || initialData.period.end.slice(0, 10)
  );

  const handlePresetSelect = (p: DatePreset) => {
    setSelectedPreset(p);
    const params = new URLSearchParams();
    params.set("preset", p);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCustomDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
    const params = new URLSearchParams();
    params.set("preset", "CUSTOM");
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Operations and financial summaries
        </p>
      </div>

      {/* Date Filter Card matching 16-27-16.png */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => {
            const isActive = selectedPreset === p.value;
            return (
              <button
                key={p.value}
                onClick={() => handlePresetSelect(p.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#164e3f] text-white shadow-sm"
                    : "bg-[#FAF8F5] text-slate-600 hover:bg-[#ede8e1] border border-[#ede8e1]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* From / To Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => handleCustomDateChange(e.target.value, to)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => handleCustomDateChange(from, e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#ede8e1] p-1 rounded-2xl w-fit">
        {(["Orders", "Buyers", "Accounts", "Employees"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white text-[#164e3f] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "Accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense by Category (range) */}
          <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Expense by Category (range)</h3>

            <div className="space-y-3 divide-y divide-[#ede8e1]/60">
              {initialData.financials.expenseCategoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No expenses in this range</p>
              ) : (
                initialData.financials.expenseCategoryBreakdown.map((c: any) => (
                  <div key={c.categoryId} className="flex justify-between items-center pt-2.5 first:pt-0 text-xs">
                    <span className="text-slate-700 font-medium">{c.name}</span>
                    <span className="font-bold text-slate-900 tabular-nums">৳ {c.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense Totals */}
          <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Expense Totals</h3>

            <div className="space-y-3 divide-y divide-[#ede8e1]/60 text-xs">
              <div className="flex justify-between items-center pt-2.5 first:pt-0">
                <span className="text-slate-600">Total Expenses</span>
                <span className="font-bold text-slate-900 tabular-nums">৳ {initialData.financials.expensesTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-600">Expenses Count</span>
                <span className="font-bold text-slate-900 tabular-nums">{initialData.financials.expensesCount}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 text-[#164e3f]">
                <span className="font-semibold">Payments received (range)</span>
                <span className="font-bold tabular-nums">৳ {initialData.financials.paymentsReceived.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-600">Net Cash Movement</span>
                <span className="font-bold text-slate-900 tabular-nums">৳ {initialData.financials.netCashMovement.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Orders" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders by Status */}
          <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Orders by Status</h3>

            <div className="space-y-2.5 divide-y divide-[#ede8e1]/60 text-xs">
              {initialData.orders.byStatus.map((s: any) => (
                <div key={s.status} className="flex justify-between items-center pt-2 first:pt-0">
                  <span className="text-slate-700 font-medium">{s.status.replace(/_/g, " ")}</span>
                  <span className="font-bold text-slate-900 tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Orders in Range */}
          <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Orders in Range</h3>

            <div className="space-y-3 divide-y divide-[#ede8e1]/60 text-xs">
              <div className="flex justify-between items-center pt-2.5 first:pt-0">
                <span className="text-slate-600">Total orders</span>
                <span className="font-bold text-slate-900 tabular-nums">{initialData.orders.totalCount}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-600">Order value</span>
                <span className="font-bold text-slate-900 tabular-nums">৳ {initialData.orders.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-600">Total Pieces</span>
                <span className="font-bold text-slate-900 tabular-nums">{initialData.orders.totalQuantity} pcs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Buyers" && (
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Buyer Financial Position</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FAF8F5] border border-[#ede8e1] p-4 rounded-xl">
              <span className="text-slate-400 text-xs font-medium">Lifetime Receivables</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.dues.lifetimeReceivables.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-[#FAF8F5] border border-[#ede8e1] p-4 rounded-xl">
              <span className="text-slate-400 text-xs font-medium">Lifetime Collected</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.dues.lifetimeCollected.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-[#fef9ee] border border-amber-200 p-4 rounded-xl">
              <span className="text-amber-800 text-xs font-medium">Lifetime Outstanding Due</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.dues.lifetimeOutstandingDue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Employees" && (
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Payroll & Advances Summary</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#FAF8F5] border border-[#ede8e1] p-4 rounded-xl">
              <span className="text-slate-400 font-medium">Advances in Range</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.payroll.advancesDisbursed.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-[#FAF8F5] border border-[#ede8e1] p-4 rounded-xl">
              <span className="text-slate-400 font-medium">Bonuses in Range</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.payroll.bonusesAwarded.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-[#FAF8F5] border border-[#ede8e1] p-4 rounded-xl">
              <span className="text-slate-400 font-medium">Net Salaries Settled</span>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                ৳ {initialData.payroll.netSalariesPaid.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
