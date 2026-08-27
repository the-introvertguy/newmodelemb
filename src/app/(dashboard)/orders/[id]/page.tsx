import React from "react";
import { getOrderById } from "@/actions/orders";
import { OrderDetailsClient } from "@/components/orders/order-details-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  return (
    <div className="space-y-6">
      <OrderDetailsClient order={order} />
    </div>
  );
}
