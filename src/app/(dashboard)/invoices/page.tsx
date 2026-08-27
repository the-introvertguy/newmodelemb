import React from "react";
import Link from "next/link";
import { getInvoices } from "@/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const { invoices, pagination } = await getInvoices({
    page,
    pageSize: 24,
    search,
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Generated bills and statements</p>
        </div>

        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Invoice Cards Grid */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50 text-[#164e3f]" />
          <p className="text-sm font-medium">No invoices generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#164e3f]/40 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-[#164e3f] transition-colors">
                    {inv.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{inv.buyer.companyName}</p>
                </div>
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#164e3f] transition-colors" />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-slate-400">
                  {formatDate(inv.invoiceDate, "yyyy-MM-dd")} · {inv.orders.length} orders
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(Number(inv.grandTotal))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} invoices
          </span>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/invoices?page=${pagination.page - 1}${search ? `&search=${search}` : ""}`}
              aria-disabled={pagination.page <= 1}
              className={`px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg font-medium text-slate-700 transition-colors shadow-2xs ${
                pagination.page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-slate-50"
              }`}
            >
              Previous
            </Link>
            <span className="px-2 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Link
              href={`/invoices?page=${pagination.page + 1}${search ? `&search=${search}` : ""}`}
              aria-disabled={pagination.page >= pagination.totalPages}
              className={`px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg font-medium text-slate-700 transition-colors shadow-2xs ${
                pagination.page >= pagination.totalPages
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
