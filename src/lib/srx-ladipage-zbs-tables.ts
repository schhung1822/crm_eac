import "server-only";

import { prisma2 } from "@/lib/prisma2";
import { SRX_LADIPAGE_ZBS_DEFAULT_TEMPLATE_ID } from "@/lib/srx-ladipage-zbs.shared";

// Giữ khớp với sql/20260928_create_ladipage_zbs_tables.sql.
const settingsTableDdl = `
  CREATE TABLE IF NOT EXISTS ladipage_zbs_settings (
    event_id BIGINT UNSIGNED NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    template_id VARCHAR(40) NOT NULL DEFAULT '${SRX_LADIPAGE_ZBS_DEFAULT_TEMPLATE_ID}',
    event_name VARCHAR(200) NOT NULL DEFAULT '',
    event_location VARCHAR(200) NOT NULL DEFAULT '',
    event_format VARCHAR(30) NOT NULL DEFAULT '',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const logsTableDdl = `
  CREATE TABLE IF NOT EXISTS ladipage_zbs_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NULL,
    registration_id BIGINT UNSIGNED NULL,
    is_test TINYINT(1) NOT NULL DEFAULT 0,
    code VARCHAR(30) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NULL,
    template_id VARCHAR(40) NOT NULL,
    template_data JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    msg_id VARCHAR(100) NULL,
    error_message TEXT NULL,
    response_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ladipage_zbs_logs_code (code),
    UNIQUE KEY uq_ladipage_zbs_logs_registration (registration_id),
    KEY idx_ladipage_zbs_logs_event (event_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let ensureTablesPromise: Promise<void> | undefined;

export function ensureLadipageZbsTables(): Promise<void> {
  ensureTablesPromise ??= (async () => {
    await prisma2.$executeRawUnsafe(settingsTableDdl);
    await prisma2.$executeRawUnsafe(logsTableDdl);
  })().catch((error: unknown) => {
    ensureTablesPromise = undefined;
    throw error;
  });

  return ensureTablesPromise;
}
