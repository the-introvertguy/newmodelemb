"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { updateOrder } from "@/actions/orders";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";

export function EditOrderModal({
  order,
  isOpen,
  onClose,
}: {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [orderDate, setOrderDate] = useState(
    order.orderDate ? new Date(order.orderDate).toISOString().split("T")[0] : ""
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toISOString().split("T")[0]
      : ""
  );
  const [challanNumber, setChallanNumber] = useState(order.challanNumber || "");
  const [status, setStatus] = useState<OrderStatus>(order.status || OrderStatus.PENDING);
  const [notes, setNotes] = useState(order.notes || "");

  // Line items
  const [items, setItems] = useState<
    Array<{
      productType: string;
      styleRef: string;
      designReference: string;
      quantity: number;
      unitPrice: number;
    }>
  >(
    order.items?.map((item: any) => ({
      productType: item.productType || "",
      styleRef: item.styleRef || "—",
      designReference: item.designReference || "",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    })) || [
      {
        productType: "",
        styleRef: "—",
        designReference: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]
  );

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productType: "",
        styleRef: "—",
        designReference: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Order must contain at least one product item");
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleUnitPriceBlur = (index: number) => {
    const updated = [...items];
    const raw = Number(updated[index].unitPrice);
    if (!isNaN(raw) && raw >= 0) {
      // Restrict to .5 increments or integer (e.g. 12, 12.5, 13)
      updated[index].unitPrice = Math.round(raw * 2) / 2;
      setItems(updated);
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedItems: typeof items = [];
    for (const item of items) {
      if (!item.productType.trim() || !item.designReference.trim()) {
        toast.error("All line items must have a product type and design reference");
        return;
      }
      if (item.quantity <= 0 || item.unitPrice < 0) {
        toast.error("Quantity and unit price must be valid positive numbers");
        return;
      }
      // Enforce .5 or int round on unitPrice
      const snappedPrice = Math.round(Number(item.unitPrice) * 2) / 2;
      formattedItems.push({
        ...item,
        unitPrice: snappedPrice,
      });
    }

    startTransition(async () => {
      try {
        await updateOrder({
          id: order.id,
          orderDate: orderDate ? new Date(orderDate) : undefined,
          expectedDeliveryDate: expectedDeliveryDate
            ? new Date(expectedDeliveryDate)
            : null,
          challanNumber: challanNumber.trim() || null,
          status,
          notes: notes.trim() || null,
          items: formattedItems,
        });

        toast.success(`Order ${order.orderNumber} updated successfully!`);
        onClose();
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update order");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit Order — {order.orderNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Buyer: <span className="font-semibold text-slate-700">{order.buyer?.companyName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Meta Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Challan #
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. CH-8821"
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-800"
              >
                <option value="PENDING">Pending</option>
                <option value="PRODUCT_RECEIVED">Product Received</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="COMPLETED">Completed</option>
                <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks, machine number..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Product Items Repeater */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Product Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-semibold text-[#164e3f] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#ede8e1] items-center text-xs"
                >
                  <div className="col-span-12 sm:col-span-3">
                    <input
                      type="text"
                      required
                      placeholder="Product Type (e.g. Kurti)"
                      value={item.productType}
                      onChange={(e) => handleItemChange(idx, "productType", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ede8e1] rounded-lg text-xs"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Style Ref"
                      value={item.styleRef}
                      onChange={(e) => handleItemChange(idx, "styleRef", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ede8e1] rounded-lg text-xs"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <input
                      type="text"
                      required
                      placeholder="Design Ref (e.g. D-101)"
                      value={item.designReference}
                      onChange={(e) =>
                        handleItemChange(idx, "designReference", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ede8e1] rounded-lg text-xs"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", Number(e.target.value))
                      }
                      className="w-full px-2 py-1.5 bg-white border border-[#ede8e1] rounded-lg text-xs text-center font-bold"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(idx, "unitPrice", Number(e.target.value))
                      }
                      onBlur={() => handleUnitPriceBlur(idx)}
                      className="w-full px-2 py-1.5 bg-white border border-[#ede8e1] rounded-lg text-xs text-right font-medium"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Computed Total */}
            <div className="flex justify-between items-center bg-[#FAF8F5] p-3 rounded-xl border border-[#ede8e1]">
              <span className="text-xs font-semibold text-slate-600">
                Total Line Items: {items.length}
              </span>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">New Total Amount:</span>
                <span className="text-base font-bold text-[#164e3f]">
                  ৳ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
