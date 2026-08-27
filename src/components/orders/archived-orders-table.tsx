"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { Search, ArchiveRestore, MoreHorizontal } from "lucide-react";
import { toggleOrderArchive } from "@/actions/orders";
import { toast } from "sonner";

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

export function ArchivedOrdersTable({
  initialOrders,
  pagination,
  initialSearch,
}: {
  initialOrders: any[];
  pagination: any;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleUnarchive = async (orderId: string, orderNumber: string) => {
    startTransition(async () => {
      try {
        await toggleOrderArchive({ orderId, isArchived: false });
        toast.success(`Order ${orderNumber} restored to active orders`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to unarchive order");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order, buyer, reference..."
          className="w-full sm:max-w-md pl-10 pr-4 py-2.5 bg-white border border-[#ede8e1] rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#164e3f] shadow-sm"
        />
      </form>

      {/* Table Card */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                <th className="py-3.5 px-5">Order #</th>
                <th className="py-3.5 px-4">Buyer</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4">Delivery</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/60 text-sm">
              {initialOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    No archived orders found.
                  </td>
                </tr>
              ) : (
                initialOrders.map((ord) => {
                  const totalPieces = ord.items.reduce(
                    (s: number, i: any) => s + Number(i.quantity),
                    0
                  );
                  const firstDesign = ord.items[0]?.designReference || "—";

                  return (
                    <tr key={ord.id} className="hover:bg-[#faf8f5]/60 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <Link href={`/orders/${ord.id}`} className="hover:underline">
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {ord.buyer.companyName}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                        {firstDesign}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-800">
                        {totalPieces}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {formatDate(ord.orderDate, "yyyy-MM-dd")}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {formatDate(ord.expectedDeliveryDate, "yyyy-MM-dd")}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block ${
                            STATUS_BADGE_CLASSES[ord.status as OrderStatus] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {(ord.status as string).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleUnarchive(ord.id, ord.orderNumber)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>Unarchive</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} archived orders
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(pagination.page - 1));
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(pagination.page + 1));
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
