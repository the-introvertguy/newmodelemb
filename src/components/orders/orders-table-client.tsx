"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import {
  Search,
  MoreVertical,
  Archive,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  ChevronDown,
  Plus,
  Filter,
} from "lucide-react";
import { toggleOrderArchive, updateOrderStatus, deleteOrder } from "@/actions/orders";
import { toast } from "sonner";
import { EditOrderModal } from "./edit-order-modal";

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

const FILTER_STATUSES: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "In Production", value: "IN_PRODUCTION" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Ready", value: "READY_FOR_DELIVERY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "On Hold", value: "ON_HOLD" },
];

export function OrdersTableClient({
  initialOrders,
  pagination,
  initialSearch,
  initialStatus,
}: {
  initialOrders: any[];
  pagination: any;
  initialSearch?: string;
  initialStatus?: OrderStatus;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch || "");
  const [status, setStatus] = useState<string>(initialStatus || "");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChangeFilter = (newStatus: string) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (newStatus) params.set("status", newStatus);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleArchive = async (orderId: string, orderNumber: string) => {
    setOpenMenuId(null);
    startTransition(async () => {
      try {
        await toggleOrderArchive({ orderId, isArchived: true });
        toast.success(`Order ${orderNumber} archived`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to archive order");
      }
    });
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    setOpenMenuId(null);
    if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) return;

    startTransition(async () => {
      try {
        await deleteOrder(orderId);
        toast.success(`Order ${orderNumber} deleted`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete order");
      }
    });
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOpenMenuId(null);
    startTransition(async () => {
      try {
        await updateOrderStatus({ orderId, status: newStatus });
        toast.success(`Order status updated to ${newStatus.replace(/_/g, " ")}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update status");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, buyers, challan, design ref..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#ede8e1] rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#164e3f] shadow-2xs"
          />
        </form>

        <select
          value={status}
          onChange={(e) => handleStatusChangeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[#ede8e1] rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#164e3f] shadow-2xs cursor-pointer font-medium sm:w-48"
        >
          <option value="">All statuses</option>
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

      {/* Quick Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {FILTER_STATUSES.map((item) => {
          const isActive = status === item.value;
          return (
            <button
              key={item.value}
              onClick={() => handleStatusChangeFilter(item.value)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? "bg-[#164e3f] text-white shadow-2xs"
                  : "bg-white border border-[#ede8e1] text-slate-600 hover:bg-[#FAF8F5] hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[320px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/60">
                <th className="py-3.5 px-5">Order ID</th>
                <th className="py-3.5 px-4">Buyer</th>
                <th className="py-3.5 px-4">Design Ref</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4">Delivery</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/70 text-sm">
              {initialOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                initialOrders.map((ord) => {
                  const totalPieces = ord.items.reduce(
                    (s: number, i: any) => s + Number(i.quantity),
                    0
                  );
                  const firstDesign = ord.items[0]?.designReference || "—";
                  const isMenuOpen = openMenuId === ord.id;

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-[#faf8f5]/80 transition-colors ${
                        isMenuOpen ? "relative z-30 bg-[#faf8f5]/90" : ""
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <Link href={`/orders/${ord.id}`} className="hover:underline text-[#164e3f]">
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium truncate max-w-[180px]">
                        <Link href={`/buyers/${ord.buyer.id}`} className="hover:underline">
                          {ord.buyer.companyName}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs truncate max-w-[140px]">
                        {firstDesign}
                        {ord.items.length > 1 ? ` (+${ord.items.length - 1})` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {totalPieces}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs tabular-nums">
                        {formatDate(ord.orderDate, "yyyy-MM-dd")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs tabular-nums">
                        {formatDate(ord.expectedDeliveryDate, "yyyy-MM-dd")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block ring-1 ring-inset ring-current/10 ${
                            STATUS_BADGE_CLASSES[ord.status as OrderStatus] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {(ord.status as string).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : ord.id)}
                          className={`p-1.5 rounded-xl border transition-all ${
                            isMenuOpen
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-[#FAF8F5] text-slate-600 border-[#ede8e1] hover:bg-slate-100"
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Visually Pleasing Elevated Dropdown Menu */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40 bg-transparent"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-4 top-12 w-56 bg-white border border-[#ede8e1] rounded-2xl shadow-2xl z-50 py-2 text-xs text-left ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
                              {/* View Details */}
                              <Link
                                href={`/orders/${ord.id}`}
                                className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-[#FAF8F5] font-medium transition-colors"
                              >
                                <Eye className="w-4 h-4 text-slate-400" />
                                <span>View Details</span>
                              </Link>

                              {/* Edit Order */}
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingOrder(ord);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-[#FAF8F5] font-medium transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-slate-400" />
                                <span>Edit Order</span>
                              </button>

                              <div className="my-1.5 border-t border-[#ede8e1]" />

                              {/* Status Sub-header */}
                              <div className="px-4 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Set Status
                              </div>
                              {[
                                { status: "IN_PRODUCTION", label: "In Production" },
                                { status: "COMPLETED", label: "Completed" },
                                { status: "READY_FOR_DELIVERY", label: "Ready for Delivery" },
                                { status: "DELIVERED", label: "Delivered" },
                              ].map((item) => (
                                <button
                                  key={item.status}
                                  onClick={() => handleUpdateStatus(ord.id, item.status as OrderStatus)}
                                  className="w-full flex items-center justify-between px-4 py-1.5 text-slate-600 hover:bg-[#FAF8F5] transition-colors"
                                >
                                  <span>{item.label}</span>
                                  {ord.status === item.status && (
                                    <CheckCircle className="w-3.5 h-3.5 text-[#164e3f]" />
                                  )}
                                </button>
                              ))}

                              <div className="my-1.5 border-t border-[#ede8e1]" />

                              {/* Archive */}
                              <button
                                onClick={() => handleArchive(ord.id, ord.orderNumber)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-amber-700 hover:bg-amber-50 font-medium transition-colors"
                              >
                                <Archive className="w-4 h-4 text-amber-600" />
                                <span>Archive Order</span>
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(ord.id, ord.orderNumber)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                                <span>Delete Order</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#ede8e1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-[#FAF8F5]/30">
            <span>
              Showing {initialOrders.length} of {pagination.total} orders
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(pagination.page - 1));
                  router.push(`${pathname}?${params.toString()}`);
                }}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 shadow-2xs active:scale-95 transition-all"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(pagination.page + 1));
                  router.push(`${pathname}?${params.toString()}`);
                }}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 shadow-2xs active:scale-95 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          isOpen={true}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
