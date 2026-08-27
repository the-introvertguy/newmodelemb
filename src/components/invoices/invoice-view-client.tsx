"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, Edit, Trash2, Download, Printer, X } from "lucide-react";
import { updateInvoice, deleteInvoice } from "@/actions/invoices";
import { toast } from "sonner";

export function InvoiceViewClient({ invoice: invoiceData }: { invoice: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const invoice = invoiceData.invoice;
  const settings = invoiceData.settings;

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [referenceNote, setReferenceNote] = useState(invoice.referenceNote || "");
  const [subject, setSubject] = useState(invoice.subject || "Bill for Embroidery orders.");
  const [salutation, setSalutation] = useState(
    invoice.salutationText ||
      "Dear Sir,\nWe are pleased to submit the bill of Embroidery work which done by us. We will be highly Grateful to you if you could make the payments at your earliest."
  );
  const [discount, setDiscount] = useState(String(invoice.discount || 0));
  const [advanceReceived, setAdvanceReceived] = useState(String(invoice.advanceReceived || 0));

  const [printMode, setPrintMode] = useState<"standard" | "letterhead">("standard");

  // Flatten all items across all orders in this invoice
  const flattenedItems: any[] = [];
  invoice.orders?.forEach((io: any) => {
    const ord = io.order;
    ord?.items?.forEach((item: any) => {
      flattenedItems.push({
        orderNumber: ord.orderNumber,
        challanNumber: ord.challanNumber || "—",
        orderDate: ord.orderDate,
        ...item,
      });
    });
  });

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateInvoice({
          id: invoice.id,
          referenceNote: referenceNote.trim() || null,
          subject: subject.trim() || null,
          salutationText: salutation.trim() || null,
          discount: Math.max(0, Number(discount)),
          advanceReceived: Math.max(0, Number(advanceReceived)),
        });

        toast.success("Bill updated successfully!");
        setShowEditModal(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update bill");
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete bill ${invoice.invoiceNumber}?`)) return;

    startTransition(async () => {
      try {
        await deleteInvoice(invoice.id);
        toast.success("Invoice deleted");
        router.push("/invoices");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete invoice");
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Actions Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ede8e1] rounded-2xl text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          {/* Print Mode Selector */}
          <div className="flex items-center bg-[#f3efea] p-1 rounded-2xl border border-[#ede8e1] text-xs">
            <button
              onClick={() => setPrintMode("standard")}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                printMode === "standard"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Standard (With Header)
            </button>
            <button
              onClick={() => setPrintMode("letterhead")}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                printMode === "letterhead"
                  ? "bg-[#164e3f] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Letterhead Pad Mode
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ede8e1] rounded-2xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit Bill</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Delete Invoice"
            className="p-2 bg-white border border-rose-200 text-rose-600 rounded-2xl hover:bg-rose-50 shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ede8e1] rounded-2xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print {printMode === "letterhead" ? "(Pad)" : ""}</span>
          </button>

          <a
            href={
              printMode === "letterhead"
                ? `/api/invoices/${invoice.id}/pdf?letterhead=true`
                : `/api/invoices/${invoice.id}/pdf`
            }
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download {printMode === "letterhead" ? "Pad PDF" : "PDF"}</span>
          </a>
        </div>
      </div>

      {/* Main Invoice Sheet Preview (Merriweather Serif Font) */}
      <div
        id="invoice-print-area"
        className={`bg-white border border-[#ede8e1] rounded-2xl p-4 sm:p-8 md:p-12 shadow-sm max-w-4xl mx-auto font-serif text-slate-900 leading-normal overflow-x-auto ${
          printMode === "letterhead" ? "pt-28 sm:pt-36 print:pt-40" : ""
        }`}
      >
        {/* Company Header (Only in standard mode) */}
        {printMode === "standard" && (
          <div className="text-center space-y-1 pb-4 border-b border-slate-300">
            <img
              src="/logo.svg"
              alt="New Model Logo"
              className="w-12 h-12 mx-auto mb-2 object-contain"
            />
            <h2 className="text-2xl font-bold text-[#164e3f] tracking-wide">
              {settings.companyName}
            </h2>
            <p className="text-xs italic text-slate-600">{settings.subtitle}</p>
            <p className="text-[11px] text-slate-600 max-w-md mx-auto">{settings.address}</p>
            <p className="text-[11px] text-slate-600">Mobile : {settings.phones}</p>
            <p className="text-[11px] text-slate-600">E-mail: {settings.email}</p>
          </div>
        )}

        {/* Bill Meta & Title */}
        <div className="py-4 flex flex-col sm:flex-row justify-between items-start text-xs space-y-2 sm:space-y-0">
          <div>
            <p className="text-slate-500 italic">
              Ref:{" "}
              <span className="text-slate-800 not-italic font-medium">
                {invoice.referenceNote || "—"}
              </span>
            </p>
            <p className="font-bold text-slate-900 mt-1">Bill No: {invoice.invoiceNumber}</p>
            <p className="text-slate-700">Date: {formatDate(invoice.invoiceDate, "yyyy-MM-dd")}</p>
          </div>

          <div className="sm:text-center self-center">
            <h3 className="text-lg font-bold text-[#164e3f] tracking-wide uppercase border-b-2 border-[#164e3f] pb-0.5">
              Bill - {invoice.invoiceNumber}
            </h3>
          </div>
        </div>

        {/* Buyer Details */}
        <div className="pt-2 pb-4 text-xs space-y-1">
          <p className="text-slate-500">To</p>
          <p className="font-bold text-sm text-slate-900">{invoice.buyer.companyName}</p>
          <p className="text-slate-600">Location: {invoice.buyer.address}</p>
          <p className="text-slate-600">Contact No. {invoice.buyer.phone}</p>
        </div>

        {/* Subject & Salutation */}
        <div className="pb-4 text-xs space-y-1 text-slate-800">
          <p className="font-bold">{invoice.subject || "Subject: Bill for Embroidery orders."}</p>
          <p className="italic text-slate-600">Dear Sir,</p>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
            {invoice.salutationText}
          </p>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto border border-slate-400 rounded">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-400 bg-slate-100 font-bold text-slate-800">
                <th className="py-2 px-2.5 border-r border-slate-400 text-center w-10">SL</th>
                <th className="py-2 px-2.5 border-r border-slate-400">Date</th>
                <th className="py-2 px-2.5 border-r border-slate-400">Order No</th>
                <th className="py-2 px-2.5 border-r border-slate-400">Challan #</th>
                <th className="py-2 px-2.5 border-r border-slate-400">Style Ref</th>
                <th className="py-2 px-2.5 border-r border-slate-400">Design Desc.</th>
                <th className="py-2 px-2.5 border-r border-slate-400 text-right">Per pcs</th>
                <th className="py-2 px-2.5 border-r border-slate-400 text-center">Quantity</th>
                <th className="py-2 px-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {flattenedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 font-mono text-[11px]">
                    {formatDate(item.orderDate, "dd-MM-yyyy")}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 font-bold">
                    {item.orderNumber}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300">{item.challanNumber}</td>
                  <td className="py-2 px-2.5 border-r border-slate-300">{item.styleRef || "—"}</td>
                  <td className="py-2 px-2.5 border-r border-slate-300">{item.designReference}</td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-right tabular-nums">
                    {Number(item.unitPrice) % 1 === 0
                      ? `${Number(item.unitPrice).toLocaleString("en-IN")}/-`
                      : `${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/-`}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center font-bold tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2.5 text-right font-bold tabular-nums">
                    {Number(item.totalPrice) % 1 === 0
                      ? `${Number(item.totalPrice).toLocaleString("en-IN")}/-`
                      : `${Number(item.totalPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/-`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bill Summary */}
        <div className="pt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs text-slate-800">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold tabular-nums">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>

            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Discount:</span>
                <span className="tabular-nums">-{formatCurrency(Number(invoice.discount))}</span>
              </div>
            )}

            {Number(invoice.advanceReceived) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Advance Received:</span>
                <span className="tabular-nums">-{formatCurrency(Number(invoice.advanceReceived))}</span>
              </div>
            )}

            <div className="pt-2 border-t-2 border-slate-800 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="tabular-nums">{formatCurrency(Number(invoice.grandTotal))}</span>
            </div>
          </div>
        </div>

        {/* In Words */}
        <div className="pt-4 text-xs italic text-slate-800 border-t border-slate-300 mt-4">
          <span className="font-bold not-italic">In Words: </span>
          {invoice.inWords}
        </div>

        {/* Footer Signature */}
        <div className="pt-16 flex justify-between items-end text-xs">
          <div className="text-center">
            <div className="w-32 border-t border-slate-400 pt-1 text-slate-600">Buyer Signature</div>
          </div>

          <div className="text-right space-y-1">
            <p className="italic text-slate-600">Your faithfully,</p>
            <p className="font-bold text-[#164e3f] text-sm">{invoice.proprietorName || "Radwen Hossain"}</p>
            <p className="text-slate-600">Proprietor, {settings.companyName}</p>
          </div>
        </div>
      </div>

      {/* Edit Invoice Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">Edit Invoice Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Note
                </label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salutation Text
                </label>
                <textarea
                  rows={3}
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Advance Received (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advanceReceived}
                    onChange={(e) => setAdvanceReceived(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900"
                  />
                </div>
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
