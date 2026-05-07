// src/lib/ordersByCustomer.ts
import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

type Paging = { page?: number; pageSize?: number | "all" | -1 };

export async function getOrdersByCustomer(
  customerIdRaw: string,
  paging?: Paging,
): Promise<{ rows: Channel[]; total: number }> {
  const customerId = String(customerIdRaw || "").trim();
  const wantAll = !paging || paging.pageSize === undefined || paging.pageSize === "all" || Number(paging.pageSize) <= 0;

  const page = Number(paging?.page ?? 1) || 1;
  const pageSize = wantAll ? undefined : Number(paging?.pageSize) || 20;
  const offset = pageSize ? (page - 1) * pageSize : undefined;

  const db = getDB();

  // ===== helper build =====
  const limitSql = pageSize ? " LIMIT ? OFFSET ? " : "";
  const limitParams = pageSize ? [pageSize, offset!] : [];

  // Fetch orders by customer ID
  const selectBase = `
    SELECT
      id,
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
    WHERE customer_ID = ?
    ORDER BY create_time DESC
    ${limitSql}
  `;

  const [rows] = await db.query<any[]>(selectBase, [customerId, ...limitParams]);

  // Get total count
  let total: number;
  if (wantAll) {
    total = rows?.length ?? 0;
  } else {
    const [cntResult] = await db.query<any[]>(`SELECT COUNT(*) AS total FROM ${legacyEacTables.orders} WHERE customer_ID = ?`, [
      customerId,
    ]);
    total = Number(cntResult?.[0]?.total ?? 0);
  }

  const parsed = (rows ?? []).map((r) =>
    channelSchema.parse({
      id: Number(r.id) || 0,
      order_ID: String(r.order_ID),
      brand: String(r.brand ?? ""),
      create_time: r.create_time ? new Date(r.create_time) : new Date(0),
      customer_ID: String(r.customer_ID ?? ""),
      name_customer: String(r.name_customer ?? ""),
      phone: String(r.phone ?? ""),
      address: String(r.address ?? ""),
      seller: String(r.seller ?? ""),
      kenh_ban: String(r.kenh_ban ?? ""),
      note: String(r.note ?? ""),
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

  return { rows: parsed, total };
}
