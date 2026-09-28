import "server-only";

import { prisma2 } from "@/lib/prisma2";
import {
  defaultSrxWebsitePopupSettings,
  parseSrxWebsitePopupSettings,
  type SrxWebsitePopupSettings,
  type SrxWebsitePopupSettingsState,
} from "@/lib/srx-website-popup.shared";

/** Khóa trong bảng website_settings; website SRX_web đọc cùng khóa này. */
const POPUP_SETTING_KEY = "promo_popup";

let ensureTablePromise: Promise<unknown> | undefined;

function ensureWebsiteSettingsTable(): Promise<unknown> {
  ensureTablePromise ??= prisma2
    .$executeRawUnsafe(
      `
        CREATE TABLE IF NOT EXISTS website_settings (
          setting_key VARCHAR(100) NOT NULL,
          setting_value JSON NOT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
    )
    .catch((error: unknown) => {
      ensureTablePromise = undefined;
      throw error;
    });

  return ensureTablePromise;
}

type SettingRow = {
  setting_value: unknown;
  updated_at: Date | null;
};

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

export async function getSrxWebsitePopupSettings(): Promise<SrxWebsitePopupSettingsState> {
  await ensureWebsiteSettingsTable();

  const rows = await prisma2.$queryRawUnsafe<SettingRow[]>(
    "SELECT setting_value, updated_at FROM website_settings WHERE setting_key = ? LIMIT 1",
    POPUP_SETTING_KEY,
  );
  const row = rows[0];

  if (!row) {
    return { ...defaultSrxWebsitePopupSettings, updated_at: null };
  }

  const parsed = parseSrxWebsitePopupSettingsSafely(readSettingValue(row.setting_value));

  return { ...parsed, updated_at: row.updated_at };
}

function parseSrxWebsitePopupSettingsSafely(value: unknown): SrxWebsitePopupSettings {
  try {
    return parseSrxWebsitePopupSettings(value);
  } catch {
    return defaultSrxWebsitePopupSettings;
  }
}

export async function saveSrxWebsitePopupSettings(input: unknown): Promise<SrxWebsitePopupSettingsState> {
  const settings = parseSrxWebsitePopupSettings(input);

  await ensureWebsiteSettingsTable();
  await prisma2.$executeRawUnsafe(
    `
      INSERT INTO website_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    `,
    POPUP_SETTING_KEY,
    JSON.stringify(settings),
  );

  return getSrxWebsitePopupSettings();
}
