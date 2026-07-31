import crypto from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import type { ZaloProfile } from "@/lib/srx-zalo-graph";

/**
 * Ghép tài khoản Zalo vào bảng users dùng chung với website SRX.
 *
 * Website và Mini App chung một bảng users nên người dùng đăng nhập bằng Zalo hay bằng
 * email/mật khẩu trên web đều ra cùng một tài khoản.
 */

export type SrxUserRow = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  display_name: string | null;
  status: string;
  avatar_url: string | null;
};

const USER_SELECT_FIELDS = "id, email, phone, full_name, display_name, status, avatar_url";

async function findUserById(userId: number): Promise<SrxUserRow | null> {
  const db = getSrxDB();
  const [rows] = await db.query<RowDataPacket[]>(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ? LIMIT 1`, [
    userId,
  ]);

  return (rows[0] as SrxUserRow | undefined) ?? null;
}

let zaloColumnsPromise: Promise<{ hasZaloId: boolean; hasAuthProvider: boolean }> | null = null;

/**
 * Cột zalo_id/auth_provider chỉ có sau khi chạy database/mysql/10_zalo_qr_login.sql của SRX_web.
 * Thiếu cột thì vẫn đăng nhập được, chỉ khớp tài khoản theo số điện thoại.
 */
async function getZaloColumns() {
  zaloColumnsPromise ??= (async () => {
    try {
      const db = getSrxDB();
      const [rows] = await db.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM users WHERE Field IN ('zalo_id', 'auth_provider')`,
      );
      const columnNames = rows.map((row) => String(row.Field));

      return {
        hasZaloId: columnNames.includes("zalo_id"),
        hasAuthProvider: columnNames.includes("auth_provider"),
      };
    } catch (error) {
      console.error("Failed to inspect zalo auth columns:", error);
      return { hasZaloId: false, hasAuthProvider: false };
    }
  })();

  return zaloColumnsPromise;
}

/**
 * Băm mật khẩu theo đúng định dạng SRX_web đang dùng (pbkdf2_sha512), để bản ghi tạo ở đây
 * tương thích với hàm verifyPassword bên website.
 */
function hashPassword(password: string): string {
  const iterations = 120_000;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");

  return `pbkdf2_sha512$${iterations}$${salt}$${hash}`;
}

function buildPlaceholderEmail(zaloId: string): string {
  const domain = String(process.env.ZALO_PLACEHOLDER_EMAIL_DOMAIN ?? "zalo.srx.local").trim();
  const safeId = zaloId.replace(/[^a-zA-Z0-9_-]/g, "");

  return `zalo.${safeId}@${domain}`.toLowerCase();
}

async function touchExistingUser(
  userId: number,
  profile: ZaloProfile,
  { hasZaloId, linkZaloId }: { hasZaloId: boolean; linkZaloId: boolean },
): Promise<SrxUserRow | null> {
  const db = getSrxDB();
  const updates = ["last_login_at = NOW()"];
  const params: unknown[] = [];

  if (profile.avatarUrl) {
    updates.push("avatar_url = COALESCE(avatar_url, ?)");
    params.push(profile.avatarUrl);
  }

  if (profile.phone) {
    // Không ghi đè số cũ, chỉ điền khi tài khoản chưa có số.
    updates.push("phone = COALESCE(phone, ?)");
    params.push(profile.phone);
  }

  if (hasZaloId && linkZaloId && profile.zaloId) {
    updates.push("zalo_id = ?");
    params.push(profile.zaloId);
  }

  await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, [...params, userId]);

  return findUserById(userId);
}

type ZaloColumns = { hasZaloId: boolean; hasAuthProvider: boolean };

/** Tìm tài khoản đã có sẵn theo zalo_id -> số điện thoại -> email placeholder. */
async function findExistingZaloUser(profile: ZaloProfile, columns: ZaloColumns): Promise<SrxUserRow | null> {
  const db = getSrxDB();

  if (columns.hasZaloId && profile.zaloId) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${USER_SELECT_FIELDS} FROM users WHERE zalo_id = ? AND deleted_at IS NULL LIMIT 1`,
      [profile.zaloId],
    );

    if (rows.length) {
      return touchExistingUser(Number(rows[0].id), profile, { hasZaloId: columns.hasZaloId, linkZaloId: false });
    }
  }

  if (profile.phone) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${USER_SELECT_FIELDS} FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
      [profile.phone],
    );

    if (rows.length) {
      return touchExistingUser(Number(rows[0].id), profile, { hasZaloId: columns.hasZaloId, linkZaloId: true });
    }
  }

  const [byPlaceholderEmail] = await db.query<RowDataPacket[]>(
    `SELECT ${USER_SELECT_FIELDS} FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
    [buildPlaceholderEmail(profile.zaloId)],
  );

  if (byPlaceholderEmail.length) {
    return touchExistingUser(Number(byPlaceholderEmail[0].id), profile, {
      hasZaloId: columns.hasZaloId,
      linkZaloId: true,
    });
  }

  return null;
}

function buildZaloUserFullName(profile: ZaloProfile): string {
  if (profile.fullName) {
    return profile.fullName;
  }

  return profile.phone ? `Zalo ${profile.phone}` : `Zalo ${profile.zaloId}`;
}

async function createZaloUser(profile: ZaloProfile, columns: ZaloColumns): Promise<SrxUserRow | null> {
  const db = getSrxDB();

  // Tài khoản tạo qua Zalo không có mật khẩu người dùng đặt: sinh chuỗi ngẫu nhiên không
  // đoán được để password_hash luôn hợp lệ mà không ai đăng nhập bằng mật khẩu được.
  const placeholderPasswordHash = hashPassword(crypto.randomBytes(48).toString("hex"));
  const fullName = buildZaloUserFullName(profile);

  const insertColumns = [
    "email",
    "password_hash",
    "full_name",
    "display_name",
    "avatar_url",
    "status",
    "last_login_at",
  ];
  const placeholders = ["?", "?", "?", "?", "?", "'active'", "NOW()"];
  const values: unknown[] = [
    buildPlaceholderEmail(profile.zaloId),
    placeholderPasswordHash,
    fullName,
    fullName,
    profile.avatarUrl,
  ];

  if (profile.phone) {
    insertColumns.push("phone");
    placeholders.push("?");
    values.push(profile.phone);
  }

  if (columns.hasZaloId && profile.zaloId) {
    insertColumns.push("zalo_id");
    placeholders.push("?");
    values.push(profile.zaloId);
  }

  if (columns.hasAuthProvider) {
    insertColumns.push("auth_provider");
    placeholders.push("'zalo'");
  }

  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    values,
  );

  return findUserById(result.insertId);
}

/**
 * Website và Mini App dùng chung bảng users:
 *   1. Khớp theo zalo_id đã liên kết trước đó.
 *   2. Chưa có thì khớp theo số điện thoại Zalo trả về (tài khoản đăng ký trên web).
 *   3. Vẫn không có thì tạo tài khoản mới với email placeholder vì users.email là NOT NULL.
 */
export async function findOrCreateZaloUser(profile: ZaloProfile): Promise<SrxUserRow | null> {
  const columns = await getZaloColumns();
  const existingUser = await findExistingZaloUser(profile, columns);

  return existingUser ?? createZaloUser(profile, columns);
}
