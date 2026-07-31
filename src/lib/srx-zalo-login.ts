import crypto from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import { type SrxUserRow } from "@/lib/srx-zalo-users";

/**
 * Đăng nhập website SRX bằng cách quét mã QR trên Zalo Mini App.
 *
 * Website (SRX_web) tạo ticket trong bảng `zalo_login_tickets` rồi hiển thị mã QR.
 * Mini App quét mã, mở lên và gọi hai endpoint ở đây:
 *   1. scan    -> đánh dấu "đã quét, đang chờ xác nhận trên điện thoại"
 *   2. confirm -> tạo phiên trong `user_sessions` và gắn token vào ticket
 * Website poll thấy trạng thái `confirmed` thì đổi lấy cookie phiên.
 *
 * Mini App không bao giờ nhận session token; nó chỉ ghi token vào ticket, trình duyệt
 * đã tạo ticket mới đọc được (bảo vệ bằng browser_secret_hash phía website).
 *
 * crm-eac và SRX_web dùng chung một database nên bảng ticket là điểm gặp nhau của hai bên.
 */

/** Phiên đăng nhập web tạo qua QR sống 30 ngày, khớp với SESSION_DURATION_DAYS của SRX_web. */
const SESSION_DURATION_DAYS = 30;

export type ZaloLoginTicketStatus = "pending" | "scanned" | "confirmed" | "claimed" | "cancelled" | "expired";

export type ZaloLoginTicketRow = {
  id: number;
  ticket: string;
  status: ZaloLoginTicketStatus;
  ip_address: string | null;
  user_agent: string | null;
  is_expired: number;
  expires_in_seconds: number;
};

export type { SrxUserRow };

export function normalizeTicket(value: unknown): string {
  const ticket = String(value ?? "")
    .trim()
    .toLowerCase();

  return /^[a-f0-9]{48}$/.test(ticket) ? ticket : "";
}

export async function findTicket(ticket: string): Promise<ZaloLoginTicketRow | null> {
  const db = getSrxDB();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, ticket, status, ip_address, user_agent,
            -- Để MySQL tự so hạn bằng đồng hồ của chính nó, tránh lệch múi giờ với Node.
            (expires_at <= NOW()) AS is_expired,
            TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS expires_in_seconds
       FROM zalo_login_tickets
      WHERE ticket = ?
      LIMIT 1`,
    [ticket],
  );

  return (rows[0] as ZaloLoginTicketRow | undefined) ?? null;
}

export function isTicketExpired(row: ZaloLoginTicketRow): boolean {
  return Number(row.is_expired) === 1;
}

export function isTicketActionable(row: ZaloLoginTicketRow): boolean {
  return !isTicketExpired(row) && ["pending", "scanned"].includes(row.status);
}

export async function markTicketScanned(ticketId: number): Promise<void> {
  const db = getSrxDB();

  await db.query(
    `UPDATE zalo_login_tickets
        SET status = 'scanned', scanned_at = COALESCE(scanned_at, NOW())
      WHERE id = ? AND status = 'pending' AND expires_at > NOW()`,
    [ticketId],
  );
}

export async function cancelTicket(ticketId: number): Promise<void> {
  const db = getSrxDB();

  await db.query(
    `UPDATE zalo_login_tickets SET status = 'cancelled' WHERE id = ? AND status IN ('pending', 'scanned')`,
    [ticketId],
  );
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Tạo phiên rồi gắn vào ticket. Điều kiện `status IN ('pending','scanned')` đảm bảo một
 * ticket chỉ sinh đúng một phiên dù Mini App gọi confirm nhiều lần.
 * Hạn dùng `NOW() + INTERVAL` của MySQL thay vì Date của JS để không lệch múi giờ.
 */
export async function confirmTicketLogin(
  ticket: ZaloLoginTicketRow,
  user: SrxUserRow,
): Promise<{ ok: true } | { ok: false; reason: "expired" }> {
  const db = getSrxDB();
  const sessionToken = createSessionToken();

  await db.query(
    `INSERT INTO user_sessions (
        user_id, session_token, device_name, ip_address, user_agent, last_activity_at, expires_at
     ) VALUES (?, ?, 'Zalo QR', ?, ?, NOW(), NOW() + INTERVAL ? DAY)`,
    // IP/user agent lấy theo trình duyệt đã tạo ticket, vì phiên này được dùng trên web.
    [user.id, sessionToken, ticket.ip_address, ticket.user_agent, SESSION_DURATION_DAYS],
  );

  const [result] = await db.query<ResultSetHeader>(
    `UPDATE zalo_login_tickets
        SET status = 'confirmed', user_id = ?, session_token = ?, confirmed_at = NOW()
      WHERE id = ? AND status IN ('pending', 'scanned') AND expires_at > NOW()`,
    [user.id, sessionToken, ticket.id],
  );

  if (!result.affectedRows) {
    // Ticket vừa hết hạn hoặc bị hủy giữa chừng: gỡ phiên vừa tạo để không để lại rác.
    await db.query(`DELETE FROM user_sessions WHERE session_token = ?`, [sessionToken]);
    return { ok: false, reason: "expired" };
  }

  await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);

  return { ok: true };
}
