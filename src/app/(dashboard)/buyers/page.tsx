import React from "react";
import { getBuyers } from "@/actions/buyers";
import { BuyersListClient } from "@/components/buyers/buyers-list-client";

export const dynamic = "force-dynamic";

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const { buyers, pagination } = await getBuyers({
    page,
    pageSize: 24,
    search,
    isActive: true,
  });

  return (
    <div className="space-y-6">
      <BuyersListClient initialBuyers={buyers} pagination={pagination} initialSearch={search} />
    </div>
  );
}
