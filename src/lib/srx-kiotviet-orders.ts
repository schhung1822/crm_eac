import "server-only";

import { createKiotVietOrder, KiotVietApiError } from "@/lib/kiotviet-client";
import { prisma2 } from "@/lib/prisma2";
import { buildKiotVietOrderDraft, type KiotVietOrderDraft } from "@/lib/srx-kiotviet-order-payload";
import type { SrxKiotVietOrderSync } from "@/lib/srx-kiotviet-orders.shared";

// Một lượt gửi bị treo quá lâu (VD tiến trình chết giữa chừng) thì cho phép gửi lại.
const PROCESSING_TIMEOUT_MINUTES = 5;

let ensureTablePromise: Promise<unknown> | undefined;

// Giữ khớp với sql/20260928_create_kiotviet_tables.sql.
function ensureKiotVietOrderSyncsTable(): Promise<unknown> {
  ensureTablePromise ??= prisma2
    .$executeRawUnsafe(
      `
        CREATE TABLE IF NOT EXISTS kiotviet_order_syncs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          order_id BIGINT UNSIGNED NOT NULL,
          order_number VARCHAR(30) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'processing',
          kiotviet_order_id BIGINT NULL,
          kiotviet_order_code VARCHAR(50) NULL,
          warnings_json JSON NULL,
          error_message TEXT NULL,
          request_json JSON NULL,
          response_json JSON NULL,
          attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          synced_at DATETIME NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uq_kiotviet_order_syncs_order (order_id),
          KEY idx_kiotviet_order_syncs_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
    )
    .catch((error: unknown) => {
      ensureTablePromise = undefined;
      throw error;
    });

  return ensureTablePromise;
}

type SyncRow = {
  status: string;
  kiotviet_order_id: bigint | null;
  kiotviet_order_code: string | null;
  warnings_json: unknown;
  error_message: string | null;
  attempt_count: number | bigint;
  updated_at: Date;
  synced_at: Date | null;
};

function readJsonArray(value: unknown): string[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

export async function getSrxKiotVietOrderSync(orderId: string): Promise<SrxKiotVietOrderSync | null> {
  await ensureKiotVietOrderSyncsTable();

  const rows = await prisma2.$queryRawUnsafe<SyncRow[]>(
    `
      SELECT status, kiotviet_order_id, kiotviet_order_code, warnings_json, error_message, attempt_count,
             updated_at, synced_at
      FROM kiotviet_order_syncs
      WHERE order_id = ?
      LIMIT 1
    `,
    BigInt(orderId),
  );
  const row = rows.at(0);

  if (!row) {
    return null;
  }

  return {
    status: row.status === "synced" || row.status === "failed" ? row.status : "processing",
    kiotviet_order_id: row.kiotviet_order_id?.toString() ?? "",
    kiotviet_order_code: row.kiotviet_order_code ?? "",
    warnings: readJsonArray(row.warnings_json),
    error_message: row.error_message ?? "",
    attempt_count: Number(row.attempt_count),
    updated_at: row.updated_at,
    synced_at: row.synced_at,
  };
}

/** Xem trước dữ liệu sẽ gửi, không tạo khách hàng hay đơn nào trên KiotViet. */
export async function previewSrxKiotVietOrder(orderId: string): Promise<KiotVietOrderDraft | null> {
  return buildKiotVietOrderDraft({ id: orderId }, { createCustomer: false });
}

/**
 * Giữ quyền gửi cho một đơn: chỉ một tiến trình được gửi tại một thời điểm, và đơn đã đồng bộ thì không gửi lại.
 * Trả về false nếu đơn đã đồng bộ hoặc đang được gửi.
 */
async function claimOrder(orderId: bigint, orderNumber: string): Promise<boolean> {
  await prisma2.$executeRawUnsafe(
    "INSERT IGNORE INTO kiotviet_order_syncs (order_id, order_number, status) VALUES (?, ?, 'failed')",
    orderId,
    orderNumber,
  );

  const claimed = await prisma2.$executeRawUnsafe(
    `
      UPDATE kiotviet_order_syncs
      SET status = 'processing', attempt_count = attempt_count + 1, error_message = NULL
      WHERE order_id = ?
        AND (status = 'failed'
          OR (status = 'processing' AND updated_at < NOW() - INTERVAL ${PROCESSING_TIMEOUT_MINUTES} MINUTE))
    `,
    orderId,
  );

  return claimed > 0;
}

async function finishSync(
  orderId: bigint,
  result:
    | { status: "synced"; draft: KiotVietOrderDraft; kiotvietId: number; kiotvietCode: string; response: unknown }
    | { status: "failed"; draft: KiotVietOrderDraft | null; errorMessage: string; response?: unknown },
): Promise<void> {
  const synced = result.status === "synced";

  await prisma2.$executeRawUnsafe(
    `
      UPDATE kiotviet_order_syncs
      SET status = ?, kiotviet_order_id = ?, kiotviet_order_code = ?, warnings_json = ?, error_message = ?,
          request_json = ?, response_json = ?, synced_at = IF(? = 'synced', NOW(), synced_at)
      WHERE order_id = ?
    `,
    result.status,
    synced ? BigInt(result.kiotvietId) : null,
    synced ? result.kiotvietCode : null,
    JSON.stringify(result.draft?.warnings ?? []),
    synced ? null : result.errorMessage,
    result.draft ? JSON.stringify(result.draft.payload) : null,
    result.response === undefined ? null : JSON.stringify(result.response),
    result.status,
    orderId,
  );
}

export type SrxKiotVietSyncOutcome =
  | { status: "synced"; code: string; warnings: string[] }
  | { status: "skipped"; reason: string }
  | { status: "failed"; errorMessage: string };

async function findOrder(orderRef: { id?: string; orderNumber?: string }) {
  const rows = await prisma2.$queryRawUnsafe<{ id: bigint; order_number: string }[]>(
    `SELECT id, order_number FROM orders WHERE ${orderRef.id ? "id = ?" : "order_number = ?"} LIMIT 1`,
    orderRef.id ? BigInt(orderRef.id) : (orderRef.orderNumber ?? ""),
  );

  return rows.at(0) ?? null;
}

/** Dựng dữ liệu (tạo khách mới nếu cần) rồi tạo đơn trên KiotViet; mọi kết quả đều được ghi vào kiotviet_order_syncs. */
async function pushOrder(orderId: bigint): Promise<SrxKiotVietSyncOutcome> {
  let draft: KiotVietOrderDraft | null = null;

  try {
    draft = await buildKiotVietOrderDraft({ id: orderId.toString() }, { createCustomer: true });

    if (!draft) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if ((draft.payload.orderDetails as unknown[]).length === 0) {
      throw new Error(`Không có sản phẩm nào khớp mã KiotViet. ${draft.warnings.join("; ")}`);
    }

    const { order: created, raw } = await createKiotVietOrder(draft.payload);
    await finishSync(orderId, {
      status: "synced",
      draft,
      kiotvietId: created.id,
      kiotvietCode: created.code,
      response: raw,
    });

    return { status: "synced", code: created.code, warnings: draft.warnings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Không gửi được đơn lên KiotViet";
    await finishSync(orderId, {
      status: "failed",
      draft,
      errorMessage,
      response: error instanceof KiotVietApiError ? error.body : undefined,
    });

    return { status: "failed", errorMessage };
  }
}

/** Đẩy một đơn website lên KiotViet thành "Phiếu tạm". Gọi nhiều lần cũng chỉ tạo một đơn. */
export async function syncSrxOrderToKiotViet(orderRef: {
  id?: string;
  orderNumber?: string;
}): Promise<SrxKiotVietSyncOutcome> {
  await ensureKiotVietOrderSyncsTable();

  const order = await findOrder(orderRef);

  if (!order) {
    return { status: "skipped", reason: "Không tìm thấy đơn hàng" };
  }

  if (!(await claimOrder(order.id, order.order_number))) {
    return { status: "skipped", reason: "Đơn đã được đồng bộ hoặc đang được gửi" };
  }

  return pushOrder(order.id);
}
