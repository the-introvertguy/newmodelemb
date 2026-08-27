import React from "react";
import { prisma } from "@/lib/prisma";
import { NewOrderForm } from "@/components/orders/new-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
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
      <NewOrderForm buyers={buyers} />
    </div>
  );
}
