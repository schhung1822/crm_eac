import type { NextRequest } from "next/server";

import type { RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import { getSrxCustomerById, type SrxCustomer } from "@/lib/srx-users";
import { createSessionToken } from "@/lib/srx-zalo-login";
import type { SrxUserRow } from "@/lib/srx-zalo-users";

/**
 * Phiên đăng nhập của Zalo Mini App.
 *
 * Mini App uỷ quyền bằng Zalo (accessToken + phoneToken), server đổi lấy tài khoản trong
 * bảng `users` dùng chung với website rồi cấp một session token lưu ở `user_sessions`.
 * Mini App gửi token đó ở header `Authorization: Bearer <token>` cho các request sau.
 *
 * Khác với luồng QR (website giữ token, Mini App không thấy token), ở đây token thuộc về
 * chính Mini App nên `device_name` được đánh dấu riêng để phân biệt phiên trên web.
 */

const MINIAPP_SESSION_DURATION_DAYS = 30;
const MINIAPP_DEVICE_NAME = "Zalo Mini App";
const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export type MiniAppCustomer = {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string | null;
  avatarUrl: string;
  status: SrxCustomer["status"];
  isEmailVerified: boolean;
  memberSince: string;
  defaultAddress: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/** Email placeholder do luồng Zalo sinh ra không phải email thật của khách, nên ẩn đi. */
function resolvePublicEmail(email: string): string {
  const placeholderDomain = String(process.env.ZALO_PLACEHOLDER_EMAIL_DOMAIN ?? "zalo.srx.local")
    .trim()
    .toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  return normalizedEmail.endsWith(`@${placeholderDomain}`) ? "" : email.trim();
}

export function toMiniAppCustomer(customer: SrxCustomer, fallbackAvatarUrl = ""): MiniAppCustomer {
  return {
    id: customer.id,
    fullName: customer.full_name,
    displayName: customer.display_name || customer.full_name,
    email: resolvePublicEmail(customer.email),
    phone: customer.phone,
    gender: customer.gender,
    dateOfBirth: toIsoString(customer.date_of_birth),
    // Khách chưa có ảnh trong DB thì tạm dùng ảnh Zalo để màn hình luôn có avatar.
    avatarUrl: customer.avatar_url || fallbackAvatarUrl,
    status: customer.status,
    isEmailVerified: customer.is_email_verified,
    memberSince: customer.created_at.toISOString(),
    defaultAddress: customer.default_address,
    orderCount: customer.order_count,
    totalSpent: customer.total_spent,
    lastOrderAt: toIsoString(customer.last_order_at),
  };
}

export async function getMiniAppCustomer(
  userId: number | string,
  fallbackAvatarUrl = "",
): Promise<MiniAppCustomer | null> {
  const customer = await getSrxCustomerById(String(userId));

  return customer ? toMiniAppCustomer(customer, fallbackAvatarUrl) : null;
}

export function normalizeSessionToken(value: unknown): string {
  const token = String(value ?? "")
    .trim()
    .toLowerCase();

  return SESSION_TOKEN_PATTERN.test(token) ? token : "";
}

/** Token nằm ở header Authorization: Bearer <token>. */
export function readMiniAppSessionToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, value] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer") {
    return "";
  }

  return normalizeSessionToken(value);
}

export async function createMiniAppSession(
  user: SrxUserRow,
  { ipAddress, userAgent }: { ipAddress: string | null; userAgent: string | null },
): Promise<{ token: string; expiresAt: string }> {
  const db = getSrxDB();
  const token = createSessionToken();

  await db.query(
    `INSERT INTO user_sessions (
        user_id, session_token, device_name, ip_address, user_agent, last_activity_at, expires_at
     ) VALUES (?, ?, ?, ?, ?, NOW(), NOW() + INTERVAL ? DAY)`,
    [user.id, token, MINIAPP_DEVICE_NAME, ipAddress, userAgent, MINIAPP_SESSION_DURATION_DAYS],
  );

  await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT expires_at FROM user_sessions WHERE session_token = ? LIMIT 1`,
    [token],
  );

  const expiresAt = rows[0]?.expires_at as Date | string | undefined;

  return { token, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "" };
}

/**
 * Trả về user_id nếu token còn hiệu lực. Hạn dùng để MySQL tự so bằng NOW() cho khỏi lệch
 * múi giờ với Node, giống các truy vấn ticket.
 */
export async function resolveMiniAppSessionUserId(token: string): Promise<number | null> {
  const normalizedToken = normalizeSessionToken(token);

  if (!normalizedToken) {
    return null;
  }

  const db = getSrxDB();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT s.user_id
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.session_token = ?
        AND s.expires_at > NOW()
        AND u.deleted_at IS NULL
        AND u.status NOT IN ('inactive', 'banned')
      LIMIT 1`,
    [normalizedToken],
  );

  if (!rows.length) {
    return null;
  }

  await db.query(`UPDATE user_sessions SET last_activity_at = NOW() WHERE session_token = ?`, [normalizedToken]);

  return Number(rows[0].user_id);
}

export async function revokeMiniAppSession(token: string): Promise<void> {
  const normalizedToken = normalizeSessionToken(token);

  if (!normalizedToken) {
    return;
  }

  const db = getSrxDB();

  await db.query(`DELETE FROM user_sessions WHERE session_token = ?`, [normalizedToken]);
}
