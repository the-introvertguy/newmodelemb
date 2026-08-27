import React from "react";
import { getInvoiceById } from "@/actions/invoices";
import { InvoiceViewClient } from "@/components/invoices/invoice-view-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  return (
    <div className="space-y-6">
      <InvoiceViewClient invoice={invoice} />
    </div>
  );
}
