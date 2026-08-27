"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  Edit,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  X,
  CreditCard,
} from "lucide-react";
import { recordPayment } from "@/actions/accounts";
import { updateBuyer } from "@/actions/buyers";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  DELIVERED: "bg-[#164e3f] text-white",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  READY_FOR_DELIVERY: "bg-[#dcfce7] text-[#166534]",
  IN_PRODUCTION: "bg-[#ede9fe] text-[#5b21b6]",
  PRODUCT_RECEIVED: "bg-[#e0f2fe] text-[#0369a1]",
  PENDING: "bg-[#f1f5f9] text-[#475569]",
  ON_HOLD: "bg-[#fef3c7] text-[#92400e]",
  CANCELLED: "bg-[#ffe4e6] text-[#9f1239]",
};

export function BuyerProfileClient({
  buyer,
  stats,
  ledger,
}: {
  buyer: any;
  stats: any;
  ledger: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Edit Buyer State
  const [companyName, setCompanyName] = useState(buyer.companyName);
  const [contactPerson, setContactPerson] = useState(buyer.contactPerson);
  const [phone, setPhone] = useState(buyer.phone);
  const [email, setEmail] = useState(buyer.email || "");
  const [address, setAddress] = useState(buyer.address);

  // Buyer Ledger Pagination State
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 10;
  const totalLedgerPages = Math.max(1, Math.ceil((ledger.entries?.length || 0) / ledgerPageSize));
  const paginatedLedgerEntries = (ledger.entries || []).slice(
    (ledgerPage - 1) * ledgerPageSize,
    ledgerPage * ledgerPageSize
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    startTransition(async () => {
      try {
        await recordPayment({
          buyerId: buyer.id,
          amount: Number(paymentAmount),
          paymentDate: new Date(paymentDate),
          paymentMethod: paymentMethod as any,
          referenceNo: referenceNo.trim() || null,
          notes: paymentNotes.trim() || null,
        });

        toast.success(`Payment of ৳ ${Number(paymentAmount).toLocaleString("en-IN")} recorded!`);
        setShowPaymentModal(false);
        setPaymentAmount("");
        setReferenceNo("");
        setPaymentNotes("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to record payment");
      }
    });
  };

  const handleUpdateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateBuyer({
          id: buyer.id,
          companyName,
          contactPerson,
          phone,
          email: email || null,
          address,
        });

        toast.success("Buyer details updated!");
        setShowEditModal(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update buyer");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/buyers"
            className="p-2 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{buyer.companyName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{buyer.contactPerson}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#ede8e1] rounded-2xl text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit</span>
          </button>

          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to remove ${buyer.companyName}? This will also delete their ledger records.`)) return;
              try {
                const { deleteBuyer } = await import("@/actions/buyers");
                await deleteBuyer(buyer.id);
                toast.success(`Buyer ${buyer.companyName} removed`);
                router.push("/buyers");
              } catch (err: any) {
                toast.error(err.message || "Failed to delete buyer");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-2xl text-sm font-medium hover:bg-rose-50 shadow-sm transition-colors"
          >
            <span>Delete</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Total Billed
          </span>
          <p className="text-2xl font-bold text-slate-900">
            ৳ {stats.totalReceivable.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Payments Received
          </span>
          <p className="text-2xl font-bold text-slate-900">
            ৳ {stats.totalPaid.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-[#164e3f] text-white p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold opacity-75 tracking-wider">
            Net Outstanding
          </span>
          <p className="text-2xl font-bold">
            ৳ {stats.netDue.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white border border-[#ede8e1] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Orders
          </span>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.ordersCount}</p>
            <p className="text-[11px] text-slate-400">{buyer.invoices?.length || 0} invoices</p>
          </div>
        </div>
      </div>

      {/* Middle Split: Contact & Address (left) & Buyer Ledger (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Contact & Address Card (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block">
            Contact & Address
          </span>

          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 font-medium block mb-0.5">PHONE</span>
              <p className="font-semibold text-slate-900">{buyer.phone}</p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-0.5">EMAIL</span>
              <p className="font-semibold text-slate-900">{buyer.email || "—"}</p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-0.5">ADDRESS</span>
              <p className="font-semibold text-slate-900 leading-relaxed">{buyer.address}</p>
            </div>
          </div>
        </div>

        {/* Buyer Ledger Card (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#ede8e1]">
            <h3 className="font-bold text-slate-900 text-base">Buyer Ledger</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ede8e1] text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Receivable</th>
                  <th className="py-3 px-4 text-right">Payment</th>
                  <th className="py-3 px-5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede8e1]/60 text-xs">
                {ledger.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No financial transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedLedgerEntries.map((entry: any) => {
                    const isDebit = Number(entry.debitAmount) > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-[#FAF8F5]/50">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {formatDate(entry.entryDate, "yyyy-MM-dd")}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {entry.entryType === "RECEIVABLE_ORDER" ? "Order" : "Payment"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {entry.referenceNumber || "Cash"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                          {isDebit ? formatCurrency(entry.debitAmount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                          {!isDebit ? `৳ ${Number(entry.creditAmount).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-slate-900 tabular-nums">
                          ৳ {Number(entry.runningBalance).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Pagination */}
          {totalLedgerPages > 1 && (
            <div className="p-3 border-t border-[#ede8e1] flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {ledgerPage} of {totalLedgerPages} ({ledger.entries.length} entries)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  Prev
                </button>
                <button
                  disabled={ledgerPage >= totalLedgerPages}
                  onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Split: Orders List & Invoices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Card */}
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Orders</h3>

          <div className="space-y-3">
            {buyer.orders.length === 0 ? (
              <p className="text-xs text-slate-400">No orders for this buyer yet.</p>
            ) : (
              buyer.orders.map((ord: any) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between py-2.5 border-b border-[#ede8e1]/60 last:border-0"
                >
                  <div>
                    <Link
                      href={`/orders/${ord.id}`}
                      className="font-bold text-slate-900 text-xs hover:underline"
                    >
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {formatDate(ord.orderDate, "yyyy-MM-dd")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(ord.totalAmount)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        STATUS_BADGE_CLASSES[ord.status as OrderStatus] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ord.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices Card */}
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Invoices</h3>

          <div className="space-y-3">
            {buyer.invoices.length === 0 ? (
              <p className="text-xs text-slate-400">No invoices issued for this buyer yet.</p>
            ) : (
              buyer.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2.5 border-b border-[#ede8e1]/60 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-bold text-slate-900 text-xs hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {formatDate(inv.invoiceDate, "yyyy-MM-dd")}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(inv.grandTotal)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-800"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / Receipt No
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. Cheque # 99201 or bKash TrxID"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Buyer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">Edit Buyer</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBuyer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
