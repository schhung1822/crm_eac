import { getSrxOrders } from "@/lib/srx-orders";

import { OrdersManager } from "./_components/orders-manager";

export default async function Page() {
  const orders = await getSrxOrders();

  return <OrdersManager initialOrders={orders} />;
}
