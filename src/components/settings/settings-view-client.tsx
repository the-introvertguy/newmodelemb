"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { updateCompanySettings } from "@/actions/settings";
import { toast } from "sonner";
import { Building2, History, Save } from "lucide-react";

export function SettingsViewClient({
  settings,
  auditLogs,
}: {
  settings: any;
  auditLogs: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [companyName, setCompanyName] = useState(settings?.companyName || "New Model Embroidery");
  const [tagline, setTagline] = useState(settings?.tagline || "A Computerized Embroidery Project");
  const [proprietorName, setProprietorName] = useState(settings?.proprietorName || "Radwen Hossain");
  const [factoryAddress, setFactoryAddress] = useState(
    settings?.factoryAddress ||
      "South Azampur, House 23, R-1, Block-A, Jalal Ahmed Soroni Road, Dhakhin Khan, Dhaka-1230"
  );
  const [phone1, setPhone1] = useState(settings?.phone1 || "01731-992361");
  const [phone2, setPhone2] = useState(settings?.phone2 || "01971-992361");
  const [email, setEmail] = useState(settings?.email || "newmodelemb@gmail.com");
  const [defaultSalutation, setDefaultSalutation] = useState(
    settings?.defaultSalutation ||
      "We are pleased to submit the bill of Embroidery work which done by us. We will be highly Grateful to you if you could make the payments at your earliest."
  );

  // Audit Logs Pagination
  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 15;
  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / auditPageSize));
  const paginatedAuditLogs = auditLogs.slice(
    (auditPage - 1) * auditPageSize,
    auditPage * auditPageSize
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateCompanySettings({
          companyName,
          tagline,
          proprietorName,
          factoryAddress,
          phone1,
          phone2: phone2 || undefined,
          email: email || undefined,
          defaultSalutation,
        });

        toast.success("Factory settings updated successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update settings");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Factory profile, invoice settings and audit trail
        </p>
      </div>

      {/* Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-[#ede8e1] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#ede8e1]">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#164e3f]" />
            <h2 className="text-lg font-bold text-slate-900">Factory Branding & Invoice Profile</h2>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proprietor Name</label>
            <input
              type="text"
              required
              value={proprietorName}
              onChange={(e) => setProprietorName(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone</label>
            <input
              type="text"
              required
              value={phone1}
              onChange={(e) => setPhone1(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary Phone</label>
            <input
              type="text"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Factory Address</label>
          <input
            type="text"
            required
            value={factoryAddress}
            onChange={(e) => setFactoryAddress(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Default Invoice Salutation Text
          </label>
          <textarea
            rows={3}
            value={defaultSalutation}
            onChange={(e) => setDefaultSalutation(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm"
          />
        </div>
      </form>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#ede8e1] flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">System Audit Trail</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/60 text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5]/50">
                    <td className="py-3 px-5 text-slate-500 font-mono">
                      {formatDate(log.createdAt, "yyyy-MM-dd · HH:mm:ss")}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#164e3f]">{log.action}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-600">{log.user?.fullName || log.user?.username || "System"}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-[150px]">
                      {log.entityId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Log Pagination */}
        {totalAuditPages > 1 && (
          <div className="p-4 border-t border-[#ede8e1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Showing {(auditPage - 1) * auditPageSize + 1} to{" "}
              {Math.min(auditPage * auditPageSize, auditLogs.length)} of{" "}
              {auditLogs.length} audit logs
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                Page {auditPage} of {totalAuditPages}
              </span>
              <button
                disabled={auditPage >= totalAuditPages}
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-[#ede8e1] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium text-slate-700 transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
