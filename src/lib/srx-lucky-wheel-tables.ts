import "server-only";

import type { RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";

/**
 * Tạo / nâng cấp các bảng lucky_wheel_* ở lần dùng đầu tiên (giống website_settings của popup).
 * Bản SQL chạy tay nằm ở SRX_web/database/mysql/12_lucky_wheel.sql.
 */

const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS website_settings (
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS lucky_wheel_prizes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    image_url VARCHAR(500) NOT NULL,
    prize_type ENUM('voucher', 'gift', 'no_prize') NOT NULL DEFAULT 'gift',
    reward_code VARCHAR(100) NULL,
    claim_instructions VARCHAR(500) NULL,
    voucher_config JSON NULL,
    weight INT UNSIGNED NOT NULL DEFAULT 0,
    stock_total INT UNSIGNED NULL,
    stock_used INT UNSIGNED NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lucky_wheel_prizes_active (is_active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS lucky_wheel_spin_grants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    source ENUM('signup', 'referral') NOT NULL,
    grant_key VARCHAR(100) NOT NULL,
    spins INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lucky_wheel_spin_grants_key (grant_key),
    KEY idx_lucky_wheel_spin_grants_user (user_id, source),
    CONSTRAINT fk_lucky_wheel_spin_grants_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS lucky_wheel_spins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    prize_id BIGINT UNSIGNED NULL,
    prize_name VARCHAR(150) NOT NULL,
    prize_type ENUM('voucher', 'gift', 'no_prize') NOT NULL,
    reward_code VARCHAR(100) NULL,
    claim_instructions VARCHAR(500) NULL,
    status ENUM('won', 'fulfilled') NOT NULL DEFAULT 'won',
    fulfilled_at DATETIME NULL,
    discount_code_id BIGINT UNSIGNED NULL,
    zbs_status ENUM('none', 'pending', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'none',
    zbs_msg_id VARCHAR(100) NULL,
    zbs_error VARCHAR(500) NULL,
    zbs_sent_at DATETIME NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lucky_wheel_spins_user (user_id, created_at),
    KEY idx_lucky_wheel_spins_created_at (created_at),
    CONSTRAINT fk_lucky_wheel_spins_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lucky_wheel_spins_prize
      FOREIGN KEY (prize_id) REFERENCES lucky_wheel_prizes (id) ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS lucky_wheel_referral_codes (
    user_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_lucky_wheel_referral_codes_code (code),
    CONSTRAINT fk_lucky_wheel_referral_codes_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS lucky_wheel_referrals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visitor_token CHAR(48) NOT NULL,
    referrer_user_id BIGINT UNSIGNED NOT NULL,
    referred_user_id BIGINT UNSIGNED NULL,
    status ENUM('visited', 'signed_up', 'credited') NOT NULL DEFAULT 'visited',
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signed_up_at DATETIME NULL,
    credited_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lucky_wheel_referrals_token (visitor_token),
    UNIQUE KEY uq_lucky_wheel_referrals_referred (referred_user_id),
    KEY idx_lucky_wheel_referrals_referrer (referrer_user_id, status),
    CONSTRAINT fk_lucky_wheel_referrals_referrer
      FOREIGN KEY (referrer_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lucky_wheel_referrals_referred
      FOREIGN KEY (referred_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/**
 * Bản đầu cộng lượt khi kích hoạt Zalo (source 'zalo_activation'); nay chỉ cần đăng nhập
 * (source 'signup'). Bảng tạo theo bản cũ thì đổi các lượt cũ sang 'signup' – giữ nguyên số
 * lượt, không cộng trùng – rồi bỏ giá trị cũ. Chỉ chạy khi cột còn giá trị cũ.
 */
async function upgradeLegacyGrantSource(): Promise<void> {
  const db = getSrxDB();
  const [columns] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM lucky_wheel_spin_grants LIKE 'source'`);
  const columnType = String(columns[0]?.Type ?? "");

  if (!columnType.includes("zalo_activation")) {
    return;
  }

  await db.query(
    `ALTER TABLE lucky_wheel_spin_grants MODIFY COLUMN source ENUM('zalo_activation', 'signup', 'referral') NOT NULL`,
  );
  await db.query(
    `UPDATE lucky_wheel_spin_grants SET source = 'signup', grant_key = CONCAT('signup:', user_id)
      WHERE source = 'zalo_activation'`,
  );
  await db.query(`ALTER TABLE lucky_wheel_spin_grants MODIFY COLUMN source ENUM('signup', 'referral') NOT NULL`);
}

/** Cột thêm cho voucher tự sinh + gửi ZBS; SRX_web cũng tự thêm khi cần. */
const VOUCHER_COLUMNS: ReadonlyArray<[table: string, column: string, definition: string]> = [
  ["lucky_wheel_prizes", "voucher_config", "JSON NULL"],
  ["lucky_wheel_spins", "discount_code_id", "BIGINT UNSIGNED NULL"],
  ["lucky_wheel_spins", "zbs_status", "ENUM('none', 'pending', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'none'"],
  ["lucky_wheel_spins", "zbs_msg_id", "VARCHAR(100) NULL"],
  ["lucky_wheel_spins", "zbs_error", "VARCHAR(500) NULL"],
  ["lucky_wheel_spins", "zbs_sent_at", "DATETIME NULL"],
];

async function addMissingVoucherColumns(): Promise<void> {
  const db = getSrxDB();

  for (const [table, column, definition] of VOUCHER_COLUMNS) {
    const [rows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);

    if (!rows.length) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

let ensureTablesPromise: Promise<void> | undefined;

export function ensureLuckyWheelTables(): Promise<void> {
  ensureTablesPromise ??= (async () => {
    const db = getSrxDB();

    for (const statement of CREATE_TABLE_STATEMENTS) {
      await db.query(statement);
    }

    await upgradeLegacyGrantSource();
    await addMissingVoucherColumns();
  })().catch((error: unknown) => {
    ensureTablesPromise = undefined;
    throw error;
  });

  return ensureTablesPromise;
}
