import React from "react";
import { getComprehensiveReport, DatePreset } from "@/actions/reports";
import { ReportsViewClient } from "@/components/reports/reports-view-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.preset as DatePreset) || "TODAY";
  const from = params.from;
  const to = params.to;

  const data = await getComprehensiveReport(preset, from, to);

  return (
    <div className="space-y-6">
      <ReportsViewClient
        initialData={data}
        initialPreset={preset}
        initialFrom={from}
        initialTo={to}
      />
    </div>
  );
}
