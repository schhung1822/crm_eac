import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import { ensureLuckyWheelTables } from "@/lib/srx-lucky-wheel-tables";
import {
  defaultSrxLuckyWheelSettings,
  parseSrxLuckyWheelPrize,
  parseSrxLuckyWheelPrizeInput,
  parseSrxLuckyWheelSettings,
  parseSrxLuckyWheelSpin,
  srxLuckyWheelSpinStatusSchema,
  srxLuckyWheelStatsSchema,
  srxLuckyWheelVoucherConfigSchema,
  type SrxLuckyWheelPrize,
  type SrxLuckyWheelVoucherConfig,
  type SrxLuckyWheelSettings,
  type SrxLuckyWheelSettingsState,
  type SrxLuckyWheelSpin,
  type SrxLuckyWheelStats,
} from "@/lib/srx-lucky-wheel.shared";

/**
 * Vòng quay may mắn của website SRX (SRX_web đọc cùng các bảng này).
 *
 * Bảng được tạo ở lần mở trang đầu tiên, giống website_settings của popup. Bản SQL chạy tay nằm ở
 * SRX_web/database/mysql/12_lucky_wheel.sql.
 */

const SETTING_KEY = "lucky_wheel";
const RECENT_SPINS_LIMIT = 100;

function readSettingValue(rawValue: unknown): unknown {
  // MySQL trả JSON dạng object, MariaDB trả chuỗi.
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return {};
    }
  }

  return rawValue ?? {};
}

function parseSettingsSafely(value: unknown): SrxLuckyWheelSettings {
  try {
    return parseSrxLuckyWheelSettings(value);
  } catch {
    return defaultSrxLuckyWheelSettings;
  }
}

export async function getSrxLuckyWheelSettings(): Promise<SrxLuckyWheelSettingsState> {
  await ensureLuckyWheelTables();

  const [rows] = await getSrxDB().query<RowDataPacket[]>(
    "SELECT setting_value, updated_at FROM website_settings WHERE setting_key = ? LIMIT 1",
    [SETTING_KEY],
  );
  const row = rows[0];

  if (!row) {
    return { ...defaultSrxLuckyWheelSettings, updated_at: null };
  }

  return { ...parseSettingsSafely(readSettingValue(row.setting_value)), updated_at: row.updated_at as Date | null };
}

export async function saveSrxLuckyWheelSettings(input: unknown): Promise<SrxLuckyWheelSettingsState> {
  const settings = parseSrxLuckyWheelSettings(input);

  await ensureLuckyWheelTables();
  await getSrxDB().query(
    `INSERT INTO website_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
    [SETTING_KEY, JSON.stringify(settings)],
  );

  return getSrxLuckyWheelSettings();
}

const PRIZE_SELECT = `
  SELECT p.*, (SELECT COUNT(*) FROM lucky_wheel_spins s WHERE s.prize_id = p.id) AS win_count
  FROM lucky_wheel_prizes p
`;

/** MySQL trả JSON dạng object, MariaDB trả chuỗi. */
function readJsonColumn(rawValue: unknown): unknown {
  if (typeof rawValue !== "string") {
    return rawValue ?? null;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function readVoucherConfig(rawValue: unknown): SrxLuckyWheelVoucherConfig | null {
  const parsed = srxLuckyWheelVoucherConfigSchema.safeParse(readJsonColumn(rawValue));
  return parsed.success ? parsed.data : null;
}

function mapPrize(row: RowDataPacket): SrxLuckyWheelPrize {
  return parseSrxLuckyWheelPrize({
    ...row,
    is_active: Boolean(Number(row.is_active)),
    stock_total: row.stock_total === null ? null : Number(row.stock_total),
    voucher_config: readVoucherConfig(row.voucher_config),
  });
}

export async function getSrxLuckyWheelPrizes(): Promise<SrxLuckyWheelPrize[]> {
  await ensureLuckyWheelTables();

  const [rows] = await getSrxDB().query<RowDataPacket[]>(`${PRIZE_SELECT} ORDER BY p.sort_order ASC, p.id ASC`);

  return rows.map(mapPrize);
}

async function getSrxLuckyWheelPrize(prizeId: string): Promise<SrxLuckyWheelPrize | null> {
  const [rows] = await getSrxDB().query<RowDataPacket[]>(`${PRIZE_SELECT} WHERE p.id = ? LIMIT 1`, [prizeId]);

  return rows[0] ? mapPrize(rows[0]) : null;
}

function toPrizeValues(input: unknown) {
  const prize = parseSrxLuckyWheelPrizeInput(input);

  return [
    prize.name,
    prize.description,
    prize.image_url,
    prize.prize_type,
    prize.reward_code,
    prize.claim_instructions,
    prize.weight,
    prize.stock_total,
    prize.sort_order,
    prize.is_active ? 1 : 0,
    prize.prize_type === "voucher" && prize.voucher_config ? JSON.stringify(prize.voucher_config) : null,
  ];
}

export async function createSrxLuckyWheelPrize(input: unknown): Promise<SrxLuckyWheelPrize> {
  await ensureLuckyWheelTables();

  const [result] = await getSrxDB().query<ResultSetHeader>(
    `INSERT INTO lucky_wheel_prizes (
        name, description, image_url, prize_type, reward_code, claim_instructions,
        weight, stock_total, sort_order, is_active, voucher_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    toPrizeValues(input),
  );

  const prize = await getSrxLuckyWheelPrize(String(result.insertId));

  if (!prize) {
    throw new Error("Không thể tạo phần thưởng");
  }

  return prize;
}

export async function updateSrxLuckyWheelPrize(prizeId: string, input: unknown): Promise<SrxLuckyWheelPrize | null> {
  await ensureLuckyWheelTables();

  const [result] = await getSrxDB().query<ResultSetHeader>(
    `UPDATE lucky_wheel_prizes
        SET name = ?, description = ?, image_url = ?, prize_type = ?, reward_code = ?, claim_instructions = ?,
            weight = ?, stock_total = ?, sort_order = ?, is_active = ?, voucher_config = ?
      WHERE id = ?`,
    [...toPrizeValues(input), prizeId],
  );

  return result.affectedRows ? getSrxLuckyWheelPrize(prizeId) : null;
}

/** Lịch sử quay giữ nguyên (prize_id về NULL) vì mỗi lượt đã chụp lại tên và mã thưởng. */
export async function deleteSrxLuckyWheelPrize(prizeId: string): Promise<boolean> {
  await ensureLuckyWheelTables();

  const [result] = await getSrxDB().query<ResultSetHeader>("DELETE FROM lucky_wheel_prizes WHERE id = ?", [prizeId]);

  return result.affectedRows > 0;
}

export const SPIN_SELECT = `
  SELECT s.id, s.user_id, s.prize_name, s.prize_type, s.reward_code, s.status, s.fulfilled_at, s.created_at,
         s.zbs_status, s.zbs_error, s.zbs_sent_at,
         DATE_FORMAT(dc.ends_at, '%d/%m/%Y') AS voucher_ends_on,
         COALESCE(NULLIF(u.display_name, ''), u.full_name, '') AS customer_name,
         u.phone AS customer_phone,
         u.email AS customer_email
  FROM lucky_wheel_spins s
  LEFT JOIN users u ON u.id = s.user_id
  LEFT JOIN discount_codes dc ON dc.id = s.discount_code_id
`;

/** Email placeholder do luồng Zalo sinh ra (zalo.<id>@zalo.srx.local) không phải email thật. */
function hidePlaceholderEmail(email: unknown): string | null {
  const value = String(email ?? "").trim();
  const placeholderDomain = String(process.env.ZALO_PLACEHOLDER_EMAIL_DOMAIN ?? "zalo.srx.local")
    .trim()
    .toLowerCase();

  return value && !value.toLowerCase().endsWith(`@${placeholderDomain}`) ? value : null;
}

export function mapSpin(row: RowDataPacket): SrxLuckyWheelSpin {
  return parseSrxLuckyWheelSpin({ ...row, customer_email: hidePlaceholderEmail(row.customer_email) });
}

/** Các lượt trúng gần đây (bỏ qua ô "chúc may mắn lần sau"). */
export async function getSrxLuckyWheelRecentWins(): Promise<SrxLuckyWheelSpin[]> {
  await ensureLuckyWheelTables();

  const [rows] = await getSrxDB().query<RowDataPacket[]>(
    `${SPIN_SELECT} WHERE s.prize_type <> 'no_prize' ORDER BY s.id DESC LIMIT ?`,
    [RECENT_SPINS_LIMIT],
  );

  return rows.map(mapSpin);
}

export async function updateSrxLuckyWheelSpinStatus(spinId: string, input: unknown): Promise<SrxLuckyWheelSpin | null> {
  await ensureLuckyWheelTables();

  const status = srxLuckyWheelSpinStatusSchema.parse((input as { status?: unknown } | null)?.status);
  const db = getSrxDB();
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE lucky_wheel_spins
        SET status = ?, fulfilled_at = IF(? = 'fulfilled', COALESCE(fulfilled_at, NOW()), NULL)
      WHERE id = ?`,
    [status, status, spinId],
  );

  if (!result.affectedRows) {
    return null;
  }

  const [rows] = await db.query<RowDataPacket[]>(`${SPIN_SELECT} WHERE s.id = ? LIMIT 1`, [spinId]);

  return rows[0] ? mapSpin(rows[0]) : null;
}

export async function getSrxLuckyWheelStats(): Promise<SrxLuckyWheelStats> {
  await ensureLuckyWheelTables();

  const [rows] = await getSrxDB().query<RowDataPacket[]>(
    `SELECT
        (SELECT COUNT(*) FROM lucky_wheel_spins) AS total_spins,
        (SELECT COUNT(*) FROM lucky_wheel_spins WHERE prize_type <> 'no_prize') AS winning_spins,
        (SELECT COUNT(*) FROM lucky_wheel_spins WHERE prize_type <> 'no_prize' AND status = 'won') AS pending_fulfillment,
        (SELECT COUNT(*) FROM lucky_wheel_spin_grants WHERE source = 'signup') AS signed_in_players,
        (SELECT COUNT(*) FROM lucky_wheel_referrals WHERE status IN ('signed_up', 'credited')) AS referrals_signed_up,
        (SELECT COUNT(*) FROM lucky_wheel_referrals WHERE status = 'credited') AS referrals_credited`,
  );

  return srxLuckyWheelStatsSchema.parse(rows[0] ?? {});
}
