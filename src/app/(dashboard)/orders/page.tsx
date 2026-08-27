import React from "react";
import Link from "next/link";
import { getOrders } from "@/actions/orders";
import { formatDate } from "@/lib/utils";
import { Box, Plus, Archive, MoreHorizontal } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { OrdersTableClient } from "@/components/orders/orders-table-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: OrderStatus; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status;

  const { orders, pagination } = await getOrders({
    page,
    pageSize: 20,
    search,
    status,
    isArchived: false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">All embroidery orders</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/archive"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#ede8e1] rounded-xl text-sm font-medium text-slate-700 hover:bg-[#faf8f5] transition-colors shadow-sm"
          >
            <Archive className="w-4 h-4 text-slate-500" />
            <span>Archived</span>
          </Link>

          <Link
            href="/orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Orders Table Client Component with Filter & Actions */}
      <OrdersTableClient
        initialOrders={orders}
        pagination={pagination}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
