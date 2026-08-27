import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF8F5]">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 pt-16 md:pt-0 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto overflow-x-hidden min-h-screen">
        {children}
      </main>
    </div>
  );
}
