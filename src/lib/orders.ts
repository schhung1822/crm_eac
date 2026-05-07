// src/lib/channels.ts
import { channelSchema, Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

export interface GetChannelsOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export async function getChannels(options?: GetChannelsOptions): Promise<Channel[]> {
  const db = getDB();
  const { from, to, limit = 10000, offset = 0 } = options ?? {};

  // Xây dựng WHERE clause động
  let whereClause = "";
  const params: (Date | number)[] = [];

  if (from) {
    whereClause += "WHERE create_time >= ?";
    params.push(from);
  }

  if (to) {
    if (whereClause) {
      whereClause += " AND create_time <= ?";
    } else {
      whereClause = "WHERE create_time <= ?";
    }
    params.push(to);
  }

  const [rows] = await db.query<any[]>(
    `
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
    ${whereClause}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
  `,
    [...params, limit, offset],
  );

  return (rows ?? []).map((r) =>
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
}
