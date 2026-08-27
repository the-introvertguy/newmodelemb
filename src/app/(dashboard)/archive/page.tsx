import React from "react";
import Link from "next/link";
import { getOrders } from "@/actions/orders";
import { Archive } from "lucide-react";
import { ArchivedOrdersTable } from "@/components/orders/archived-orders-table";

export const dynamic = "force-dynamic";

export default async function ArchivedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const { orders, pagination } = await getOrders({
    page,
    pageSize: 20,
    search,
    isArchived: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Archived Orders</h1>
          <p className="text-sm text-slate-500 mt-1">All embroidery orders</p>
        </div>

        <Link
          href="/orders"
          className="flex items-center gap-2 px-4 py-2 bg-[#b45309] hover:bg-[#92400e] text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Archive className="w-4 h-4" />
          <span>Back to Active</span>
        </Link>
      </div>

      <ArchivedOrdersTable initialOrders={orders} pagination={pagination} initialSearch={search} />
    </div>
  );
}
