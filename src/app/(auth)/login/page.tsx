"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: username.trim(),
        password: password.trim(),
      });

      if (res?.error) {
        toast.error(res.error || "Invalid username or password");
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Ambient Background Decorative Circles */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-[#164e3f]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-[#ede8e1] rounded-3xl p-8 sm:p-10 shadow-lg shadow-black/5 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#164e3f]/10 border border-[#164e3f]/20 flex items-center justify-center mb-4 shadow-2xs">
            <img
              src="/logo.svg"
              alt="New Model Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            New Model Embroidery
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#164e3f] mt-1">
            Factory Management System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f] focus:bg-white transition-all shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f] focus:bg-white transition-all shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-[#164e3f] hover:bg-[#124235] text-white font-semibold text-sm rounded-2xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Factory Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#ede8e1] text-center">
          <p className="text-[11px] text-slate-400">
            Internal Production System · South Azampur, Dhaka
          </p>
        </div>
      </div>
    </div>
  );
}
