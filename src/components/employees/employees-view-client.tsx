"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, FileText, CreditCard, Coins, Gift, X } from "lucide-react";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  recordSalaryAdvance,
  recordEmployeeBonus,
  settleMonthlySalary,
} from "@/actions/employees";
import { toast } from "sonner";

export function EmployeesViewClient({ employees }: { employees: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showNewEmpModal, setShowNewEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [auditLogEmployee, setAuditLogEmployee] = useState<any | null>(null);
  const [auditLogTab, setAuditLogTab] = useState<"ALL" | "SETTLEMENTS" | "ADVANCES" | "BONUSES">(
    "ALL"
  );
  const [actionModalEmp, setActionModalEmp] = useState<any | null>(null);

  // Unified Action Modal Sub-type
  const [actionType, setActionType] = useState<"ADVANCE" | "SETTLE" | "BONUS">("ADVANCE");

  // New / Edit Employee Form State
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);

  // Action Form Inputs
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [actionDate, setActionDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleMonth, setSettleMonth] = useState(new Date().toISOString().slice(0, 7));
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [settleNotes, setSettleNotes] = useState("");

  // Aggregate stats
  const totalMonthlySalary = employees.reduce((s, e) => s + Number(e.monthlySalary), 0);
  const totalAdvancesThisMonth = employees.reduce((s, e) => {
    const unSettled =
      e.advances
        ?.filter((a: any) => !a.isSettled)
        .reduce((as: number, a: any) => as + Number(a.amount), 0) || 0;
    return s + unSettled;
  }, 0);

  // Pagination State
  const [empPage, setEmpPage] = useState(1);
  const empPageSize = 10;
  const totalEmpPages = Math.max(1, Math.ceil(employees.length / empPageSize));
  const paginatedEmployees = employees.slice((empPage - 1) * empPageSize, empPage * empPageSize);

  const handleOpenEditEmp = (emp: any) => {
    setEditingEmp(emp);
    setName(emp.name);
    setDesignation(emp.designation);
    setPhone(emp.phone);
    setAddress(emp.address);
    setMonthlySalary(String(emp.monthlySalary));
    setJoiningDate(emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : "");
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createEmployee({
          name: name.trim(),
          designation: designation.trim(),
          phone: phone.trim(),
          address: address.trim(),
          monthlySalary: Number(monthlySalary),
          joiningDate: new Date(joiningDate),
        });

        toast.success(`Employee ${name} added!`);
        setShowNewEmpModal(false);
        setName("");
        setDesignation("");
        setPhone("");
        setAddress("");
        setMonthlySalary("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to add employee");
      }
    });
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    startTransition(async () => {
      try {
        await updateEmployee({
          id: editingEmp.id,
          name: name.trim(),
          designation: designation.trim(),
          phone: phone.trim(),
          address: address.trim(),
          monthlySalary: Number(monthlySalary),
          joiningDate: new Date(joiningDate),
        });

        toast.success(`Employee ${name} updated!`);
        setEditingEmp(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update employee");
      }
    });
  };

  const handleDeleteEmployee = async (emp: any) => {
    if (!confirm(`Are you sure you want to remove employee ${emp.name}?`)) return;

    startTransition(async () => {
      try {
        await deleteEmployee(emp.id);
        toast.success(`Employee ${emp.name} deleted`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete employee");
      }
    });
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalEmp) return;

    startTransition(async () => {
      try {
        if (actionType === "ADVANCE") {
          const monthYear = actionDate.slice(0, 7);
          await recordSalaryAdvance({
            employeeId: actionModalEmp.id,
            amount: Number(amount),
            date: new Date(actionDate),
            reason: reason.trim() || "Salary Advance",
            monthYear,
          });
          toast.success(`Salary Advance of ৳ ${Number(amount).toLocaleString("en-IN")} recorded!`);
        } else if (actionType === "BONUS") {
          const monthYear = actionDate.slice(0, 7);
          await recordEmployeeBonus({
            employeeId: actionModalEmp.id,
            amount: Number(amount),
            date: new Date(actionDate),
            reason: reason.trim() || "Festival Bonus",
            monthYear,
          });
          toast.success(`Bonus of ৳ ${Number(amount).toLocaleString("en-IN")} recorded!`);
        } else if (actionType === "SETTLE") {
          await settleMonthlySalary({
            employeeId: actionModalEmp.id,
            monthYear: settleMonth,
            paymentDate: new Date(),
            otherDeductions: Number(otherDeductions) || 0,
            paymentMethod: "CASH",
            notes: settleNotes.trim() || undefined,
          });
          toast.success(`Monthly salary settled for ${settleMonth}!`);
        }

        setActionModalEmp(null);
        setAmount("");
        setReason("");
        setOtherDeductions("0");
        setSettleNotes("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Action failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Staff, advances and payroll settlements</p>
        </div>

        <button
          onClick={() => {
            setName("");
            setDesignation("");
            setPhone("");
            setAddress("");
            setMonthlySalary("");
            setShowNewEmpModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Employee</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#164e3f] text-white p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider opacity-75">
            Total Staff
          </span>
          <p className="text-3xl font-bold">{employees.length}</p>
        </div>

        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Monthly Base Payroll
          </span>
          <p className="text-3xl font-bold text-slate-900">
            ৳ {totalMonthlySalary.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-[#fef9ee] border border-amber-200/70 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-800">
            Unsettled Advances
          </span>
          <p className="text-3xl font-bold text-slate-900">
            ৳ {totalAdvancesThisMonth.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Active Status
          </span>
          <p className="text-3xl font-bold text-slate-900">
            {employees.filter((e) => e.isActive).length} / {employees.length}
          </p>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {paginatedEmployees.map((emp) => {
          const pendingEmpAdvances =
            emp.advances
              ?.filter((a: any) => !a.isSettled)
              .reduce((s: number, a: any) => s + Number(a.amount), 0) || 0;
          const remainingSalary = Math.max(0, Number(emp.monthlySalary) - pendingEmpAdvances);

          return (
            <div
              key={emp.id}
              className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Card Top */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#ede8e1] flex items-center justify-center text-slate-800 font-bold text-lg shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{emp.name}</h3>
                    <p className="text-xs text-slate-500">
                      {emp.designation} · {emp.phone}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Joined {formatDate(emp.joiningDate, "yyyy-MM-dd")}
                    </p>
                  </div>
                </div>

                {/* Top Right Action buttons (Simplified: Log icon, Edit, Delete, and Unified "+") */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => setAuditLogEmployee(emp)}
                    title="Salary Audit Log"
                    className="p-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEditEmp(emp)}
                    title="Edit Employee"
                    className="p-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteEmployee(emp)}
                    title="Delete Employee"
                    className="p-2 bg-[#FAF8F5] border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setActionModalEmp(emp);
                      setActionType("ADVANCE");
                      setAmount("");
                      setReason("");
                    }}
                    title="Log Advance, Settle, or Bonus"
                    className="flex items-center justify-center w-8 h-8 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="bg-[#FAF8F5] border border-[#ede8e1]/80 rounded-2xl p-3 grid grid-cols-4 text-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                    Base
                  </span>
                  <span className="font-bold text-slate-900">
                    ৳ {Number(emp.monthlySalary).toLocaleString("en-IN")}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                    Pending Adv.
                  </span>
                  <span
                    className={`font-bold ${pendingEmpAdvances > 0 ? "text-amber-700" : "text-slate-600"}`}
                  >
                    ৳ {pendingEmpAdvances.toLocaleString("en-IN")}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                    Settled
                  </span>
                  <span className="font-bold text-slate-900">
                    {emp.settlements?.length || 0} mos
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                    Net Due
                  </span>
                  <span className="font-bold text-[#164e3f]">
                    ৳ {remainingSalary.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employees Pagination */}
      {totalEmpPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <span>
            Showing {(empPage - 1) * empPageSize + 1} to{" "}
            {Math.min(empPage * empPageSize, employees.length)} of {employees.length} employees
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={empPage <= 1}
              onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-slate-700">
              Page {empPage} of {totalEmpPages}
            </span>
            <button
              disabled={empPage >= totalEmpPages}
              onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
              className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Unified Action Modal ("+" Button for Advance, Settle, Bonus) */}
      {actionModalEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Payroll Action — {actionModalEmp.name}
                </h2>
                <p className="text-xs text-slate-500">Choose action type</p>
              </div>
              <button
                onClick={() => setActionModalEmp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Type Selector Pills */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl">
              <button
                type="button"
                onClick={() => setActionType("ADVANCE")}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  actionType === "ADVANCE"
                    ? "bg-[#164e3f] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Advance
              </button>
              <button
                type="button"
                onClick={() => setActionType("SETTLE")}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  actionType === "SETTLE"
                    ? "bg-[#164e3f] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Settle
              </button>
              <button
                type="button"
                onClick={() => setActionType("BONUS")}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  actionType === "BONUS"
                    ? "bg-[#164e3f] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bonus
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-3.5 pt-2">
              {actionType === "ADVANCE" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Advance Amount (৳) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 3000"
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-base font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Purpose
                    </label>
                    <input
                      type="text"
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Medical, family, festival advance..."
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>
                </>
              )}

              {actionType === "BONUS" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bonus Amount (৳) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-base font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bonus Title / Reason
                    </label>
                    <input
                      type="text"
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Eid Bonus, Performance Bonus..."
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>
                </>
              )}

              {actionType === "SETTLE" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Salary Month (YYYY-MM) *
                    </label>
                    <input
                      type="month"
                      required
                      value={settleMonth}
                      onChange={(e) => setSettleMonth(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm font-mono font-medium"
                    />
                  </div>

                  {(() => {
                    const existingSettlement = actionModalEmp.settlements?.find(
                      (s: any) => s.monthYear === settleMonth
                    );
                    if (existingSettlement) {
                      return (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            ⚠️ Already Settled for {settleMonth}
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Paid ৳{" "}
                            {Number(existingSettlement.netPaidAmount).toLocaleString("en-IN")} on{" "}
                            {formatDate(existingSettlement.paymentDate, "yyyy-MM-dd")}.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Additional Deductions (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      placeholder="e.g. Paid via Cash / Bank Transfer..."
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  {/* Real-time Settlement Calculation Breakdown */}
                  {actionModalEmp &&
                    (() => {
                      const matchingAdvances =
                        actionModalEmp.advances?.filter(
                          (a: any) =>
                            !a.isSettled &&
                            (a.monthYear <= settleMonth || a.monthYear === settleMonth)
                        ) || [];
                      const matchingBonuses =
                        actionModalEmp.bonuses?.filter((b: any) => b.monthYear === settleMonth) ||
                        [];

                      const baseSalaryVal = Number(actionModalEmp.monthlySalary || 0);
                      const advancesDeductionVal = matchingAdvances.reduce(
                        (s: number, a: any) => s + Number(a.amount),
                        0
                      );
                      const bonusesAdditionVal = matchingBonuses.reduce(
                        (s: number, b: any) => s + Number(b.amount),
                        0
                      );
                      const otherDeductionsVal = Number(otherDeductions) || 0;
                      const netPayableVal = Math.max(
                        0,
                        baseSalaryVal +
                          bonusesAdditionVal -
                          advancesDeductionVal -
                          otherDeductionsVal
                      );

                      return (
                        <div className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-3.5 space-y-1.5 text-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                            Settlement Preview for {settleMonth}
                          </span>
                          <div className="flex justify-between text-slate-600">
                            <span>Base Salary:</span>
                            <span className="font-semibold tabular-nums">
                              + ৳ {baseSalaryVal.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {bonusesAdditionVal > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Bonuses ({matchingBonuses.length}):</span>
                              <span className="font-semibold tabular-nums">
                                + ৳ {bonusesAdditionVal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-amber-700">
                            <span>Pending Advances ({matchingAdvances.length}):</span>
                            <span className="font-semibold tabular-nums">
                              - ৳ {advancesDeductionVal.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {otherDeductionsVal > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Other Deductions:</span>
                              <span className="font-semibold tabular-nums">
                                - ৳ {otherDeductionsVal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-[#ede8e1] flex justify-between font-bold text-slate-900 text-sm">
                            <span>Net Payable:</span>
                            <span className="text-emerald-800 tabular-nums">
                              ৳ {netPayableVal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setActionModalEmp(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    (actionType === "SETTLE" &&
                      Boolean(
                        actionModalEmp?.settlements?.some((s: any) => s.monthYear === settleMonth)
                      ))
                  }
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Audit Log Modal */}
      {auditLogEmployee &&
        (() => {
          const advancesList = auditLogEmployee.advances || [];
          const bonusesList = auditLogEmployee.bonuses || [];
          const settlementsList = auditLogEmployee.settlements || [];

          const totalAdvancesAllTime = advancesList.reduce(
            (s: number, a: any) => s + Number(a.amount),
            0
          );
          const pendingAdvancesSum = advancesList
            .filter((a: any) => !a.isSettled)
            .reduce((s: number, a: any) => s + Number(a.amount), 0);
          const settledAdvancesSum = advancesList
            .filter((a: any) => a.isSettled)
            .reduce((s: number, a: any) => s + Number(a.amount), 0);
          const totalBonusesSum = bonusesList.reduce(
            (s: number, b: any) => s + Number(b.amount),
            0
          );
          const totalSettledPaidSum = settlementsList.reduce(
            (s: number, p: any) => s + Number(p.netPaidAmount),
            0
          );

          const allTransactions = [
            ...advancesList.map((a: any) => ({
              id: `adv-${a.id}`,
              date: a.date,
              type: "ADVANCE" as const,
              title: a.reason || "Salary Advance",
              monthYear: a.monthYear,
              amount: Number(a.amount),
              isSettled: Boolean(a.isSettled),
              details: a.isSettled
                ? "Settled in month-end payroll"
                : "Pending deduction in next settlement",
            })),
            ...bonusesList.map((b: any) => ({
              id: `bon-${b.id}`,
              date: b.date,
              type: "BONUS" as const,
              title: b.reason || "Bonus",
              monthYear: b.monthYear,
              amount: Number(b.amount),
              isSettled: true,
              details: `Festival / Performance Bonus (${b.monthYear})`,
            })),
            ...settlementsList.map((s: any) => ({
              id: `set-${s.id}`,
              date: s.paymentDate,
              type: "SETTLEMENT" as const,
              title: `Salary Settlement (${s.monthYear})`,
              monthYear: s.monthYear,
              amount: Number(s.netPaidAmount),
              isSettled: true,
              details: `Base: ৳${Number(s.baseSalary).toLocaleString("en-IN")}${Number(s.totalBonus) > 0 ? ` + Bonus: ৳${Number(s.totalBonus).toLocaleString("en-IN")}` : ""}${Number(s.totalAdvanceDeducted) > 0 ? ` - Adv: ৳${Number(s.totalAdvanceDeducted).toLocaleString("en-IN")}` : ""}${Number(s.otherDeductions) > 0 ? ` - Ded: ৳${Number(s.otherDeductions).toLocaleString("en-IN")}` : ""} (${s.paymentMethod || "CASH"}${s.notes ? ` · ${s.notes}` : ""})`,
            })),
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const filteredTransactions = allTransactions.filter((item) => {
            if (auditLogTab === "SETTLEMENTS") return item.type === "SETTLEMENT";
            if (auditLogTab === "ADVANCES") return item.type === "ADVANCE";
            if (auditLogTab === "BONUSES") return item.type === "BONUS";
            return true;
          });

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Salary & Payroll History — {auditLogEmployee.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {auditLogEmployee.designation} · Base Salary: ৳{" "}
                      {Number(auditLogEmployee.monthlySalary).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => setAuditLogEmployee(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Summary Row */}
                <div className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-white p-3 rounded-xl border border-[#ede8e1]/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Base Salary
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ৳ {Number(auditLogEmployee.monthlySalary).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#ede8e1]/60">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                      Advances Logged
                    </span>
                    <span className="text-sm font-bold text-amber-800">
                      ৳ {totalAdvancesAllTime.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {pendingAdvancesSum > 0
                        ? `(৳${pendingAdvancesSum.toLocaleString("en-IN")} pending)`
                        : "(All settled)"}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#ede8e1]/60">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                      Total Bonuses
                    </span>
                    <span className="text-sm font-bold text-emerald-800">
                      ৳ {totalBonusesSum.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {bonusesList.length} bonus record(s)
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#ede8e1]/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-700 block">
                      Settlements
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ৳ {totalSettledPaidSum.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {settlementsList.length} month(s) paid
                    </span>
                  </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setAuditLogTab("ALL")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auditLogTab === "ALL"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Transactions ({allTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditLogTab("SETTLEMENTS")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auditLogTab === "SETTLEMENTS"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Settlements ({settlementsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditLogTab("ADVANCES")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auditLogTab === "ADVANCES"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Advances ({advancesList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditLogTab("BONUSES")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auditLogTab === "BONUSES"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bonuses ({bonusesList.length})
                  </button>
                </div>

                {/* Audit Log Table */}
                <div className="overflow-x-auto border border-[#ede8e1] rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#ede8e1] bg-[#FAF8F5] text-slate-400 uppercase font-semibold text-[10px]">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Description / Breakdown</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede8e1]/60">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No transactions found in this category.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((item) => (
                          <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(item.date, "yyyy-MM-dd")}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.type === "ADVANCE" && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-semibold text-[11px]">
                                    Advance
                                  </span>
                                  {item.isSettled ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                                      Settled
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-medium">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.type === "BONUS" && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold text-[11px]">
                                  Bonus
                                </span>
                              )}

                              {item.type === "SETTLEMENT" && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-md font-semibold text-[11px]">
                                  Settlement
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{item.title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.details}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {item.type === "ADVANCE" && (
                                <span className="font-bold text-amber-700 tabular-nums">
                                  - ৳ {item.amount.toLocaleString("en-IN")}
                                </span>
                              )}
                              {item.type === "BONUS" && (
                                <span className="font-bold text-emerald-700 tabular-nums">
                                  + ৳ {item.amount.toLocaleString("en-IN")}
                                </span>
                              )}
                              {item.type === "SETTLEMENT" && (
                                <span className="font-bold text-slate-900 tabular-nums">
                                  ৳ {item.amount.toLocaleString("en-IN")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

      {/* New / Edit Employee Modal */}
      {(showNewEmpModal || editingEmp) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">
                {editingEmp ? "Edit Employee" : "New Employee"}
              </h2>
              <button
                onClick={() => {
                  setShowNewEmpModal(false);
                  setEditingEmp(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingEmp ? handleUpdateEmployee : handleCreateEmployee}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Md. Sohel Rana"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation *
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Machine Operator, Quality Checker..."
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1710-000111"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dhaka, Bangladesh"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Base Salary (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="20000"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Join Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEmpModal(false);
                    setEditingEmp(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {editingEmp ? "Save Changes" : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
