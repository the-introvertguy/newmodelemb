"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
  Coins,
  Gift,
  X,
} from "lucide-react";
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
    const unSettled = e.advances?.reduce((as: number, a: any) => as + Number(a.amount), 0) || 0;
    return s + unSettled;
  }, 0);

  // Pagination State
  const [empPage, setEmpPage] = useState(1);
  const empPageSize = 10;
  const totalEmpPages = Math.max(1, Math.ceil(employees.length / empPageSize));
  const paginatedEmployees = employees.slice(
    (empPage - 1) * empPageSize,
    empPage * empPageSize
  );

  const handleOpenEditEmp = (emp: any) => {
    setEditingEmp(emp);
    setName(emp.name);
    setDesignation(emp.designation);
    setPhone(emp.phone);
    setAddress(emp.address);
    setMonthlySalary(String(emp.monthlySalary));
    setJoiningDate(
      emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : ""
    );
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
          const totalEmpAdvances =
            emp.advances?.reduce((s: number, a: any) => s + Number(a.amount), 0) || 0;
          const remainingSalary = Math.max(0, Number(emp.monthlySalary) - totalEmpAdvances);

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
                    Advances
                  </span>
                  <span className="font-bold text-amber-700">
                    ৳ {totalEmpAdvances.toLocaleString("en-IN")}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                    Settlements
                  </span>
                  <span className="font-bold text-slate-900">
                    {emp.settlements?.length || 0}
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
            {Math.min(empPage * empPageSize, employees.length)} of{" "}
            {employees.length} employees
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
                      Salary Month (YYYY-MM)
                    </label>
                    <input
                      type="month"
                      value={settleMonth}
                      onChange={(e) => setSettleMonth(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Additional Deductions (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      placeholder="Remarks..."
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                    />
                  </div>

                  {/* Real-time Settlement Calculation Breakdown */}
                  {actionModalEmp && (
                    <div className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-3.5 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Settlement Preview
                      </span>
                      <div className="flex justify-between text-slate-600">
                        <span>Base Salary:</span>
                        <span className="font-semibold tabular-nums">
                          ৳ {Number(actionModalEmp.monthlySalary || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Advances Deducted:</span>
                        <span className="font-semibold tabular-nums">
                          - ৳{" "}
                          {(
                            actionModalEmp.advances?.reduce(
                              (s: number, a: any) => s + Number(a.amount),
                              0
                            ) || 0
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {Number(otherDeductions) > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Other Deductions:</span>
                          <span className="font-semibold tabular-nums">
                            - ৳ {Number(otherDeductions).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#ede8e1] flex justify-between font-bold text-slate-900 text-sm">
                        <span>Net Payable:</span>
                        <span className="text-emerald-800 tabular-nums">
                          ৳{" "}
                          {Math.max(
                            0,
                            Number(actionModalEmp.monthlySalary || 0) -
                              (actionModalEmp.advances?.reduce(
                                (s: number, a: any) => s + Number(a.amount),
                                0
                              ) || 0) -
                              (Number(otherDeductions) || 0)
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
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
                  disabled={isPending}
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
      {auditLogEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">
                Salary Audit Log — {auditLogEmployee.name}
              </h2>
              <button
                onClick={() => setAuditLogEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Row */}
            <div className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-4 grid grid-cols-3 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Advances
                </span>
                <span className="text-base font-bold text-slate-900">
                  ৳{" "}
                  {(
                    auditLogEmployee.advances?.reduce(
                      (s: number, a: any) => s + Number(a.amount),
                      0
                    ) || 0
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Settlements
                </span>
                <span className="text-base font-bold text-slate-900">
                  {auditLogEmployee.settlements?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Monthly Base
                </span>
                <span className="text-base font-bold text-slate-900">
                  ৳ {Number(auditLogEmployee.monthlySalary).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto border border-[#ede8e1] rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ede8e1] bg-[#FAF8F5] text-slate-400 uppercase font-semibold text-[10px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Reason / Notes</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede8e1]/60">
                  {(!auditLogEmployee.advances || auditLogEmployee.advances.length === 0) &&
                  (!auditLogEmployee.settlements || auditLogEmployee.settlements.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No transactions logged for this employee.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {auditLogEmployee.advances?.map((a: any) => (
                        <tr key={a.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-2.5 px-4 font-mono">
                            {formatDate(a.date, "yyyy-MM-dd")}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-amber-700">Advance</td>
                          <td className="py-2.5 px-4 text-slate-600">{a.reason || "General"}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            ৳ {Number(a.amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {auditLogEmployee.settlements?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-2.5 px-4 font-mono">
                            {formatDate(p.paymentDate, "yyyy-MM-dd")}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-emerald-700">
                            Salary Settlement ({p.monthYear})
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{p.notes || "Cash/Bank"}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                            ৳ {Number(p.netPaidAmount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
