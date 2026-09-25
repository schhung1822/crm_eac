import { OrderSchema, type Order } from "@/app/(main)/dashboard/_components/reports/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

function asText(value: unknown): string {
  return String(value ?? "");
}

function asNumber(value: unknown): number {
  return Number(value) || 0;
}

export async function getOrders(): Promise<Order[]> {
  const db = getDB();

  const [rows] = await db.query<any[]>(`
    SELECT
      order_ID,
      brand,
      create_time,
      customer_ID,
      name_customer,
      phone,
      address,
      seller,
      kenh_ban,
      note,
      tien_hang,
      giam_gia,
      thanh_tien,
      status,
      quantity,
      pro_ID,
      name_pro,
      brand_pro
    FROM ${legacyEacTables.orders}
    ORDER BY create_time DESC
  `);

  return (rows ?? []).map((r) =>
    OrderSchema.parse({
      order_ID: String(r.order_ID),
      brand: asText(r.brand),
      create_time: r.create_time ? new Date(r.create_time) : new Date(0),

      customer_ID: asText(r.customer_ID),
      name_customer: asText(r.name_customer),
      phone: asText(r.phone),
      address: asText(r.address),

      seller: asText(r.seller),
      kenh_ban: asText(r.kenh_ban),
      note: r.note ? String(r.note) : null,

      tien_hang: asNumber(r.tien_hang),
      giam_gia: asNumber(r.giam_gia),
      thanh_tien: asNumber(r.thanh_tien),

      status: asText(r.status),
      quantity: asNumber(r.quantity),

      pro_ID: asText(r.pro_ID),
      name_pro: asText(r.name_pro),
      brand_pro: asText(r.brand_pro),
    }),
  );
}
