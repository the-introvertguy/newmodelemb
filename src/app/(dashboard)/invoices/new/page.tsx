import React from "react";
import { prisma } from "@/lib/prisma";
import { NewInvoiceBuilder } from "@/components/invoices/new-invoice-builder";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const buyers = await prisma.buyer.findMany({
    where: { isActive: true },
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
    },
  });

  return (
    <div className="space-y-6">
      <NewInvoiceBuilder buyers={buyers} />
    </div>
  );
}
