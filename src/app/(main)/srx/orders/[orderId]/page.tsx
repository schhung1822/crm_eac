import { notFound } from "next/navigation";

import { getSrxKiotVietOrderSync } from "@/lib/srx-kiotviet-orders";
import { getSrxOrderById } from "@/lib/srx-orders";

import { OrderDetailView } from "../_components/order-detail-view";
import { OrderKiotVietCard } from "../_components/order-kiotviet-card";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  if (!/^\d+$/.test(orderId)) {
    notFound();
  }

  const [order, kiotVietSync] = await Promise.all([getSrxOrderById(orderId), getSrxKiotVietOrderSync(orderId)]);

  if (!order) {
    notFound();
  }

  return (
    <OrderDetailView
      initialValue={order}
      extraContent={<OrderKiotVietCard orderId={orderId} initialSync={kiotVietSync} />}
    />
  );
}
