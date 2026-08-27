"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, X, ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { createExpense, deleteExpense } from "@/actions/accounts";
import { toast } from "sonner";
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

const PIE_COLORS = ["#164e3f", "#0e7490", "#b45309", "#d97706", "#64748b", "#475569"];

export function AccountsViewClient({
  summary,
  initialExpenses,
  initialPayments = [],
  categories,
}: {
  summary: any;
  initialExpenses: any[];
  initialPayments?: any[];
  categories: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showAddModal, setShowAddModal] = useState(false);

  // Get current local time in HH:mm format (e.g. 17:35)
  const getCurrentLocalTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // New Expense Form State
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseTime, setExpenseTime] = useState(getCurrentLocalTime());
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "GAIN" | "EXPENSE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Prepare 7-day Bar Chart Data
  const last7DaysMap: Record<string, number> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayKey = dayNames[d.getDay()];
    last7DaysMap[dayKey] = 0;
  }

  initialExpenses.forEach((exp) => {
    const expDate = new Date(exp.date);
    const diffDays = (Date.now() - expDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      const dayKey = dayNames[expDate.getDay()];
      if (last7DaysMap[dayKey] !== undefined) {
        last7DaysMap[dayKey] += Number(exp.amount);
      }
    }
  });

  const barChartData = Object.entries(last7DaysMap).map(([day, val]) => ({
    name: day,
    amount: val,
  }));

  // Prepare Category Pie Chart Data
  const categoryMap: Record<string, number> = {};
  initialExpenses.forEach((exp) => {
    const catName = exp.category?.name || "General";
    categoryMap[catName] = (categoryMap[catName] || 0) + Number(exp.amount);
  });

  const pieChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Combine and sort recent transactions (Gain + and Expense -)
  const unifiedTransactions: Array<{
    id: string;
    type: "GAIN" | "EXPENSE";
    date: Date;
    title: string;
    subtitle: string;
    amount: number;
    paymentMethod?: string;
  }> = [];

  initialPayments.forEach((p) => {
    unifiedTransactions.push({
      id: p.id,
      type: "GAIN",
      date: new Date(p.paymentDate),
      title: p.buyer?.companyName || "Buyer Payment",
      subtitle: `Payment received (${p.paymentMethod}${p.referenceNo ? ` - ${p.referenceNo}` : ""})`,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
    });
  });

  initialExpenses.forEach((e) => {
    unifiedTransactions.push({
      id: e.id,
      type: "EXPENSE",
      date: new Date(e.date),
      title: e.category?.name || "Expense",
      subtitle: e.description || e.voucherNo || "Factory overhead",
      amount: Number(e.amount),
    });
  });

  unifiedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredTransactions = unifiedTransactions.filter((tx) => {
    if (filterType === "GAIN") return tx.type === "GAIN";
    if (filterType === "EXPENSE") return tx.type === "EXPENSE";
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleFilterChange = (type: "ALL" | "GAIN" | "EXPENSE") => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleOpenAddModal = () => {
    setExpenseTime(getCurrentLocalTime());
    setShowAddModal(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    startTransition(async () => {
      try {
        const fullDate = new Date(`${expenseDate}T${expenseTime}:00`);

        await createExpense({
          categoryId: categoryId === "NEW" ? undefined : categoryId,
          customCategoryName: categoryId === "NEW" ? customCategoryName : undefined,
          amount: Number(amount),
          date: fullDate,
          description: description.trim() || undefined,
          reference: reference.trim() || undefined,
        });

        toast.success("Expense recorded successfully!");
        setShowAddModal(false);
        setAmount("");
        setDescription("");
        setReference("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to create expense");
      }
    });
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    startTransition(async () => {
      try {
        await deleteExpense(id);
        toast.success("Expense deleted");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete expense");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Income, factory expenses and cash movement</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-all shadow-sm hover:shadow self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* KPI Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PAYMENTS COLLECTED (GAIN) */}
        <div className="bg-[#164e3f] text-white p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Payments Collected (Gain)
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            ৳ {Number(summary.totalPayments || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* TOTAL FACTORY EXPENSES */}
        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Total Expenses
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
            ৳ {Number(summary.totalExpenses || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* NET CASH FLOW */}
        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Net Cash Flow
          </span>
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${Number(summary.netCashFlow || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            ৳ {Number(summary.netCashFlow || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* TODAY EXPENSES */}
        <div className="bg-[#fef9ee] border border-amber-200/70 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-800">
            Today Expenses
          </span>
          <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
            ৳ {Number(summary.todayExpenses || 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Last 7 Days Bar Chart (col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-[#ede8e1] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block">
            Expense Trend (Last 7 Days)
          </span>

          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`৳ ${Number(val).toLocaleString("en-IN")}`, "Expense"]}
                  contentStyle={{
                    backgroundColor: "#FAF8F5",
                    borderRadius: "16px",
                    borderColor: "#ede8e1",
                  }}
                />
                <Bar dataKey="amount" fill="#164e3f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Category Donut Chart (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-[#ede8e1] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block">
            Expenses By Category
          </span>

          {pieChartData.length === 0 ? (
            <p className="text-xs text-slate-400 py-16 text-center">No categorized expenses yet</p>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`৳ ${Number(val).toLocaleString("en-IN")}`, "Total"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="w-full space-y-1.5 pt-2 border-t border-[#ede8e1]/60 text-xs">
                {pieChartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-700 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      ৳ {item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Unified Recent Transactions (Gain + and Expense -) */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-[#ede8e1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological log of payments received and expenses</p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-2xl border border-[#ede8e1]">
            <button
              onClick={() => handleFilterChange("ALL")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterType === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange("GAIN")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterType === "GAIN"
                  ? "bg-emerald-100 text-emerald-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Gain (+)
            </button>
            <button
              onClick={() => handleFilterChange("EXPENSE")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterType === "EXPENSE"
                  ? "bg-rose-100 text-rose-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Expense (-)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Source / Category</th>
                <th className="py-3 px-4">Description / Reference</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactions recorded matching your filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isGain = tx.type === "GAIN";

                  return (
                    <tr key={`${tx.type}-${tx.id}`} className="hover:bg-[#FAF8F5]/50">
                      <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                        {formatDate(tx.date, "yyyy-MM-dd · HH:mm")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isGain
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isGain ? (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Gain (+)</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3 h-3" />
                              <span>Expense (-)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {tx.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tx.subtitle}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums ${isGain ? "text-emerald-700" : "text-rose-600"}`}>
                        {isGain ? `+৳ ${tx.amount.toLocaleString("en-IN")}` : `-৳ ${tx.amount.toLocaleString("en-IN")}`}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {!isGain && (
                          <button
                            onClick={() => handleDeleteExpense(tx.id)}
                            title="Delete Expense"
                            className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#ede8e1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">New Expense</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={expenseTime}
                    onChange={(e) => setExpenseTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="NEW">+ Type or add a new category</option>
                </select>

                {categoryId === "NEW" && (
                  <input
                    type="text"
                    required
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter new category name..."
                    className="mt-2 w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expense description..."
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Voucher or invoice number"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
