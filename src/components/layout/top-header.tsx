"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Plus,
  Bell,
  Box,
  Wallet,
  Building2,
  FileText,
  Command,
  Sparkles,
  ChevronRight,
  LogOut,
  User,
  Shield,
} from "lucide-react";

export function TopHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Generate breadcrumb titles from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbName =
    segments.length === 0
      ? "Dashboard"
      : segments[0].charAt(0).toUpperCase() + segments[0].slice(1);

  const subName = segments.length > 1 ? segments[1] : null;

  return (
    <header className="no-print h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium min-w-0">
        <Link href="/" className="hover:text-slate-900 transition-colors hidden sm:inline">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
        <span className="font-semibold text-slate-900 truncate">{breadcrumbName}</span>
        {subName && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-mono text-slate-600 truncate max-w-[140px]">{subName}</span>
          </>
        )}
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Factory Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-semibold text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Factory Live</span>
        </div>

        {/* Global Quick Action: New Order */}
        <Link
          href="/orders/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Order</span>
        </Link>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200/80"
          >
            <div className="w-6 h-6 rounded bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
              {(user?.name || user?.username || "A").charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden md:inline max-w-[100px] truncate">
              {user?.name || user?.username || "Admin"}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-10 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs space-y-1 animate-in fade-in-50 zoom-in-95">
                <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                  <p className="font-bold text-slate-900">{user?.name || user?.username || "Admin"}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold uppercase">{user?.role || "Staff"}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Factory Settings</span>
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
