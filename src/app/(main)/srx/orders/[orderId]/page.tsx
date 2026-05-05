import { notFound } from "next/navigation";

import { getSrxOrderById } from "@/lib/srx-orders";

import { OrderDetailView } from "../_components/order-detail-view";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  if (!/^\d+$/.test(orderId)) {
    notFound();
  }

  const order = await getSrxOrderById(orderId);

  if (!order) {
    notFound();
  }

  return <OrderDetailView initialValue={order} />;
}
