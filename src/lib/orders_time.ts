import { channelSchema, Channel } from "@/app/(main)/dashboard/default/_components/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

type GetChannelsParams = {
  from?: string | Date;
  to?: string | Date;
};

function toDate(v?: string | Date) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeRange(from?: string | Date, to?: string | Date) {
  const f = toDate(from);
  const t = toDate(to);

  const fromDate = f ? new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0) : null;

  const toDateNorm = t ? new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999) : null;

  return { fromDate, toDateNorm };
}

export async function getChannels(params: GetChannelsParams = {}): Promise<Channel[]> {
  const db = getDB();
  const { fromDate, toDateNorm } = normalizeRange(params.from, params.to);

  const where: string[] = [];
  const values: any[] = [];

  if (fromDate) {
    where.push(`create_time >= ?`);
    values.push(fromDate);
  }
  if (toDateNorm) {
    where.push(`create_time <= ?`);
    values.push(toDateNorm);
  }

  const sql = `
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
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY create_time DESC
  `;

  const [rows] = await db.query<any[]>(sql, values);

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
