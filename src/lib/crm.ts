import { OrderSchema, type Order } from "@/app/(main)/dashboard/crm/_components/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

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
      brand: String(r.brand ?? ""),
      create_time: r.create_time ? new Date(r.create_time) : new Date(0),

      customer_ID: String(r.customer_ID ?? ""),
      name_customer: String(r.name_customer ?? ""),
      phone: String(r.phone ?? ""),
      address: String(r.address ?? ""),

      seller: String(r.seller ?? ""),
      kenh_ban: String(r.kenh_ban ?? ""),
      note: r.note ? String(r.note) : null,

      tien_hang: Number(r.tien_hang) || 0,
      giam_gia: Number(r.giam_gia) || 0,
      thanh_tien: Number(r.thanh_tien) || 0,

      status: String(r.status ?? ""),
      quantity: Number(r.quantity) || 0,

      pro_ID: String(r.pro_ID ?? ""),
      name_pro: String(r.name_pro ?? ""),
      brand_pro: String(r.brand_pro ?? ""),
    }),
  );
}
