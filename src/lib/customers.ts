/* eslint-disable complexity -- hàm ánh xạ dòng dữ liệu cũ có nhiều giá trị mặc định */
import { userSchema, Users } from "@/app/(main)/customers/_components/schema";
import { getDB } from "@/lib/db";
import { ttlCached } from "@/lib/ttl-cache";

// Danh sách khách đồng bộ từ hệ thống khác nên giữ kết quả ngắn hạn để các lần mở trang liên tiếp không truy vấn lại.
const CUSTOMERS_TTL_MS = 60_000;

export function getUser(): Promise<Users[]> {
  return ttlCached("customers:all", CUSTOMERS_TTL_MS, loadUsers);
}

async function loadUsers(): Promise<Users[]> {
  const db = getDB();

  const [rows] = await db.query<any[]>(`
    SELECT
      customer_ID,
      name,
      phone,
      class,
      gender,
      birth,
      company,
      address,
      create_by,
      create_time,
      last_payment,
      note,
      branch,
      no_hien_tai,
      tong_ban,
      tong_ban_tru_tra_hang
    FROM customer 
  `);

  return rows.map((r) =>
    userSchema.parse({
      customer_ID: String(r.customer_ID),
      name: String(r.name ?? ""),
      phone: String(r.phone ?? ""),
      class: String(r.class ?? ""),
      gender: String(r.gender ?? ""),
      birth: r.birth ? new Date(r.birth) : null,
      create_time: new Date(r.create_time),
      last_payment: new Date(r.last_payment),
      company: String(r.company ?? ""),
      address: String(r.address ?? ""),
      create_by: String(r.create_by ?? ""),
      note: String(r.note ?? ""),
      branch: String(r.branch ?? ""),
      no_hien_tai: String(r.no_hien_tai ?? ""),
      tong_ban: String(r.tong_ban ?? ""),
      tong_ban_tru_tra_hang: String(r.tong_ban_tru_tra_hang ?? ""),
    }),
  );
}
