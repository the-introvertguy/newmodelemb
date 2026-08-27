"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Box,
  Building2,
  FileText,
  Wallet,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { name: "Orders", href: "/orders", icon: Box },
  { name: "Buyers", href: "/buyers", icon: Building2 },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Users", href: "/users", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActiveRoute = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-3.5 mb-4 bg-white/60 backdrop-blur-xs rounded-2xl border border-[#ede8e1]/80 shadow-2xs">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#164e3f]/10 border border-[#164e3f]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/logo.svg"
                alt="New Model Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight text-sm tracking-tight flex items-center gap-1.5">
                <span>New Model</span>
              </h1>
              <p className="text-[9.5px] tracking-[0.16em] font-semibold text-[#164e3f] uppercase">
                Embroidery
              </p>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 md:hidden active:scale-95 transition-transform"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActiveRoute(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 relative active:scale-[0.98]",
                  active
                    ? "bg-[#164e3f] text-white shadow-sm font-semibold translate-x-0.5"
                    : "text-slate-600 hover:bg-[#ede8e1]/70 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User / Signout Footer */}
      <div className="pt-4 border-t border-[#ede8e1] px-2 space-y-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-2xl bg-white/80 border border-[#ede8e1]/70 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-[#164e3f] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {(user?.name || user?.username || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">
              {user?.name || user?.username || "Admin"}
            </p>
            <p className="text-[10px] text-[#164e3f] font-semibold uppercase tracking-wider">
              {user?.role || "Staff"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-rose-600 px-2 py-1.5 rounded-xl hover:bg-rose-50/50 transition-colors w-full text-left active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Top Navigation Bar (Shown on screens < md) */}
      <header className="no-print md:hidden fixed top-0 inset-x-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#ede8e1] px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#164e3f]/10 border border-[#164e3f]/20 flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="New Model Logo"
              className="w-5 h-5 object-contain"
            />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm tracking-tight block leading-tight">
              New Model
            </span>
            <span className="text-[9px] tracking-wider text-[#164e3f] uppercase font-semibold">
              Embroidery
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-2xl bg-white border border-[#ede8e1] text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* 2. Mobile Drawer Navigation Overlay */}
      {isMobileOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Slide-out Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#FAF8F5] p-5 shadow-2xl z-50 overflow-y-auto border-r border-[#ede8e1] flex flex-col justify-between animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* 3. Desktop Sticky Sidebar (Shown on screens >= md) */}
      <aside className="no-print hidden md:flex w-60 min-w-60 h-screen sticky top-0 bg-[#FAF8F5] border-r border-[#ede8e1] flex-col justify-between p-4 select-none">
        {navContent}
      </aside>
    </>
  );
}
