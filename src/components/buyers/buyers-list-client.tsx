"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Plus, Phone, MapPin, Building2, X } from "lucide-react";
import { createBuyer } from "@/actions/buyers";
import { toast } from "sonner";

export function BuyersListClient({
  initialBuyers,
  pagination,
  initialSearch,
}: {
  initialBuyers: any[];
  pagination: any;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch || "");
  const [showNewModal, setShowNewModal] = useState(false);

  // New Buyer Form State
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createBuyer({
          companyName,
          contactPerson,
          phone,
          altPhone: altPhone || null,
          email: email || null,
          address,
          shippingAddress: shippingAddress || null,
          notes: notes || null,
        });

        toast.success(`Buyer ${companyName} created successfully!`);
        setShowNewModal(false);
        // Reset form
        setCompanyName("");
        setContactPerson("");
        setPhone("");
        setAltPhone("");
        setEmail("");
        setAddress("");
        setShippingAddress("");
        setNotes("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to create buyer");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Buyers</h1>
          <p className="text-sm text-slate-500 mt-1">Company records and ledgers</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Buyer</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buyers by name, phone, or location..."
          className="w-full sm:max-w-md pl-10 pr-4 py-2.5 bg-white border border-[#ede8e1] rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#164e3f] shadow-sm"
        />
      </form>

      {/* Buyers Cards Grid */}
      {initialBuyers.length === 0 ? (
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-12 text-center text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-[#164e3f]/10 text-[#164e3f] flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No buyers found</p>
          <p className="text-xs text-slate-400 mt-1">Try refining your search query or add a new buyer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {initialBuyers.map((b) => {
            const initials = b.companyName
              .split(" ")
              .map((w: string) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <Link
                key={b.id}
                href={`/buyers/${b.id}`}
                className="bg-white border border-[#ede8e1] rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-[#164e3f]/50 transition-all duration-150 flex flex-col justify-between group active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#164e3f]/10 text-[#164e3f] border border-[#164e3f]/20 font-bold text-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {initials || "B"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-[#164e3f] transition-colors truncate">
                        {b.companyName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">{b.contactPerson}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.address}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3.5 mt-3.5 border-t border-[#ede8e1]/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {b._count?.orders || 0} order{b._count?.orders !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs font-semibold text-[#164e3f] group-hover:underline">
                    View profile →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} buyers
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

      {/* New Buyer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">New Buyer</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBuyer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Garments Ltd."
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rakib Hasan"
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-223344"
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Tejgaon I/A, Dhaka"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Save Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
