"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createInvoice, getEligibleOrdersForInvoice } from "@/actions/invoices";
import { toast } from "sonner";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";

interface ExtraCost {
  name: string;
  amount: number;
}

export function NewInvoiceBuilder({ buyers }: { buyers: { id: string; companyName: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [buyerId, setBuyerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [discount, setDiscount] = useState("0");
  const [advanceReceived, setAdvanceReceived] = useState("0");
  const [referenceNote, setReferenceNote] = useState("");
  const [subject, setSubject] = useState("Bill for Embroidery orders.");

  // Additional costs & Ceiling Rounding
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
  const [roundCeiling, setRoundCeiling] = useState(false);

  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch orders when buyer changes
  useEffect(() => {
    if (!buyerId) {
      setAvailableOrders([]);
      setSelectedOrderIds([]);
      return;
    }

    setLoadingOrders(true);
    getEligibleOrdersForInvoice(buyerId)
      .then((orders) => {
        setAvailableOrders(orders);
        // Default select all
        setSelectedOrderIds(orders.map((o) => o.id));
      })
      .catch((err) => toast.error(err.message || "Failed to load orders"))
      .finally(() => setLoadingOrders(false));
  }, [buyerId]);

  const handleToggleOrder = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const handleAddExtraCost = () => {
    setExtraCosts([...extraCosts, { name: "VAT / Extra Charge", amount: 0 }]);
  };

  const handleRemoveExtraCost = (index: number) => {
    setExtraCosts(extraCosts.filter((_, i) => i !== index));
  };

  const handleExtraCostChange = (index: number, field: keyof ExtraCost, value: any) => {
    const updated = [...extraCosts];
    updated[index] = { ...updated[index], [field]: value };
    setExtraCosts(updated);
  };

  // Calculations
  const selectedOrders = availableOrders.filter((o) => selectedOrderIds.includes(o.id));
  const subtotal = selectedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const extraCostsTotal = extraCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const advanceNum = Math.max(0, Number(advanceReceived) || 0);

  const rawGrandTotal = Math.max(0, subtotal + extraCostsTotal - discountNum - advanceNum);
  const grandTotal = roundCeiling ? Math.ceil(rawGrandTotal) : rawGrandTotal;

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId) {
      toast.error("Please select a buyer");
      return;
    }
    if (selectedOrderIds.length === 0) {
      toast.error("Please select at least one order to include in the bill");
      return;
    }

    // Compose extra costs into reference notes if any
    const extraChargesSummary =
      extraCosts.length > 0
        ? `Extra Charges: ${extraCosts.map((c) => `${c.name}: +৳ ${c.amount}`).join(", ")}`
        : "";
    const finalRefNote = [referenceNote.trim(), extraChargesSummary].filter(Boolean).join(" | ");

    startTransition(async () => {
      try {
        const res = await createInvoice({
          buyerId,
          orderIds: selectedOrderIds,
          invoiceDate: new Date(invoiceDate),
          subject,
          referenceNote: finalRefNote || null,
          discount: discountNum,
          advanceReceived: advanceNum,
        });

        if (res.invoice) {
          toast.success(`Bill ${res.invoice.invoiceNumber} created successfully!`);
          router.push(`/invoices/${res.invoice.id}`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to generate invoice");
      }
    });
  };

  return (
    <form onSubmit={handleGenerateInvoice} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New Invoice</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bundle eligible orders, add VAT/charges, and generate bill
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/invoices"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || selectedOrderIds.length === 0}
            className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending ? "Generating..." : "Generate Invoice"}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Selection & Right Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Buyer & Eligible Orders (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer *</label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              >
                <option value="">Select buyer</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Note (Optional)
              </label>
              <input
                type="text"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder="e.g. Autumn batch embroidery job work"
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              />
            </div>
          </div>

          {/* Orders Checkbox List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block">
                Eligible Orders (Including Archived)
              </span>
              {availableOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedOrderIds.length === availableOrders.length) {
                      setSelectedOrderIds([]);
                    } else {
                      setSelectedOrderIds(availableOrders.map((o) => o.id));
                    }
                  }}
                  className="text-xs font-semibold text-[#164e3f] hover:underline"
                >
                  {selectedOrderIds.length === availableOrders.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              )}
            </div>

            {!buyerId ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Please select a buyer to view their eligible orders.
              </p>
            ) : loadingOrders ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading orders...</p>
            ) : availableOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No orders found for this buyer.
              </p>
            ) : (
              <div className="space-y-2.5">
                {availableOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => handleToggleOrder(ord.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? "bg-[#FAF8F5] border-[#164e3f]/50 shadow-sm"
                          : "bg-white border-[#ede8e1] hover:bg-slate-50 opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-[#164e3f]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {ord.orderNumber}
                            </span>
                            {ord.isArchived && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatDate(ord.orderDate, "yyyy-MM-dd")} · {ord.items.length} product
                            {ord.items.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Additional Cost / VAT Rows Section */}
          <div className="pt-3 border-t border-[#ede8e1] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Additional Costs / VAT / Delivery Charges
              </span>
              <button
                type="button"
                onClick={handleAddExtraCost}
                className="text-xs text-[#164e3f] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charge Row</span>
              </button>
            </div>

            {extraCosts.map((cost, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#ede8e1]"
              >
                <input
                  type="text"
                  value={cost.name}
                  onChange={(e) => handleExtraCostChange(idx, "name", e.target.value)}
                  placeholder="Charge Description (e.g. VAT 5%, Delivery Fee)"
                  className="flex-1 px-3 py-1.5 bg-white border border-[#ede8e1] rounded-xl text-xs text-slate-900"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cost.amount}
                    onChange={(e) => handleExtraCostChange(idx, "amount", Number(e.target.value))}
                    placeholder="Amount"
                    className="w-28 px-3 py-1.5 bg-white border border-[#ede8e1] rounded-xl text-xs font-bold text-slate-900 text-right"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExtraCost(idx)}
                  className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Summary Card (col-span-4) */}
        <div className="lg:col-span-4 bg-[#164e3f] text-white rounded-2xl p-6 shadow-sm space-y-4">
          <span className="text-[11px] font-semibold tracking-wider uppercase opacity-75 block">
            Summary
          </span>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-80">Orders Included</span>
              <span className="font-semibold tabular-nums">{selectedOrders.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Orders Subtotal</span>
              <span className="font-bold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {extraCostsTotal > 0 && (
              <div className="flex justify-between text-emerald-200">
                <span>Extra Charges / VAT</span>
                <span className="font-bold tabular-nums">+ {formatCurrency(extraCostsTotal)}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-white/20">
            <div>
              <label className="block text-xs opacity-80 mb-1">Discount (৳)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3.5 py-2 bg-black/20 border border-white/20 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs opacity-80 mb-1">Advance Received (৳)</label>
              <input
                type="number"
                min="0"
                value={advanceReceived}
                onChange={(e) => setAdvanceReceived(e.target.value)}
                className="w-full px-3.5 py-2 bg-black/20 border border-white/20 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white tabular-nums"
              />
            </div>

            {/* Rounded Ceiling Toggle */}
            <div className="pt-2 flex items-center justify-between">
              <label
                htmlFor="ceilingToggle"
                className="text-xs opacity-90 cursor-pointer select-none font-medium"
              >
                Round up to nearest integer
              </label>
              <input
                id="ceilingToggle"
                type="checkbox"
                checked={roundCeiling}
                onChange={(e) => setRoundCeiling(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/20 space-y-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-75 block">
              Grand Total
            </span>
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              ৳ {grandTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
