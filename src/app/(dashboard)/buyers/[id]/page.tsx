import React from "react";
import { getBuyerProfile } from "@/actions/buyers";
import { BuyerProfileClient } from "@/components/buyers/buyer-profile-client";

export default async function BuyerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ledgerPage?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;
  const ledgerPage = parseInt(sParams.ledgerPage || "1", 10);

  const { buyer, stats, ledger } = await getBuyerProfile(id, ledgerPage, 20);

  return (
    <div className="space-y-6">
      <BuyerProfileClient buyer={buyer} stats={stats} ledger={ledger} />
    </div>
  );
}
