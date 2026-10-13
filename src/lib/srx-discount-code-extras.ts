import "server-only";

import type { RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import type { SrxDiscountCode, SrxDiscountCodeMutationInput } from "@/lib/srx-website.shared";

/**
 * Phần mở rộng của mã giảm giá chưa có trong prisma/schema2.prisma, đọc/ghi bằng SQL thô:
 *   - discount_codes.stack_with_public: mã riêng (class = 'private') được dùng cùng 1 mã chung
 *     trong cùng đơn hàng. Website SRX đọc cột này lúc tính giảm giá.
 *   - Nguồn của mã riêng sinh tự động (vòng quay may mắn → lucky_wheel_spins.discount_code_id).
 * Không thêm vào Prisma để Prisma không lỗi trên database chưa có cột.
 */

let stackColumnPromise: Promise<void> | undefined;

export function ensureDiscountCodeStackColumn(): Promise<void> {
  stackColumnPromise ??= (async () => {
    const db = getSrxDB();
    const [rows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM discount_codes LIKE 'stack_with_public'`);

    if (!rows.length) {
      await db.query(
        `ALTER TABLE discount_codes ADD COLUMN stack_with_public TINYINT(1) NOT NULL DEFAULT 0 AFTER class`,
      );
    }
  })().catch((error: unknown) => {
    stackColumnPromise = undefined;
    throw error;
  });

  return stackColumnPromise;
}

/** Chỉ mã riêng mới được dùng chung; mã chung luôn lưu 0. */
export function resolveStackWithPublic(input: Pick<SrxDiscountCodeMutationInput, "class" | "stack_with_public">) {
  return input.class === "private" && input.stack_with_public;
}

export async function saveDiscountCodeStackFlag(discountCodeId: string, stackWithPublic: boolean): Promise<void> {
  await ensureDiscountCodeStackColumn();
  await getSrxDB().query(`UPDATE discount_codes SET stack_with_public = ? WHERE id = ?`, [
    stackWithPublic ? 1 : 0,
    discountCodeId,
  ]);
}

async function readStackFlags(ids: string[]): Promise<Set<string>> {
  if (!ids.length) {
    return new Set();
  }

  await ensureDiscountCodeStackColumn();

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await getSrxDB().query<RowDataPacket[]>(
    `SELECT id FROM discount_codes WHERE stack_with_public = 1 AND id IN (${placeholders})`,
    ids,
  );

  return new Set(rows.map((row) => String(row.id)));
}

/** Gắn cờ dùng chung vào các mã đọc từ Prisma. */
export async function withStackFlags(discountCodes: SrxDiscountCode[]): Promise<SrxDiscountCode[]> {
  const stackableIds = await readStackFlags(discountCodes.map((discountCode) => discountCode.id));

  return discountCodes.map((discountCode) => ({
    ...discountCode,
    stack_with_public: stackableIds.has(discountCode.id),
  }));
}

export type DiscountCodeSource = {
  /** Tên hiển thị của khách nhận mã. */
  customerName: string;
  customerPhone: string;
  prizeName: string;
};

/** Mã riêng do vòng quay may mắn sinh ra: id mã → khách trúng thưởng. Chưa có bảng vòng quay thì rỗng. */
export async function getLuckyWheelCodeSources(): Promise<Record<string, DiscountCodeSource>> {
  try {
    const [rows] = await getSrxDB().query<RowDataPacket[]>(
      `SELECT s.discount_code_id, s.prize_name,
              COALESCE(NULLIF(u.display_name, ''), u.full_name, '') AS customer_name,
              COALESCE(u.phone, '') AS customer_phone
         FROM lucky_wheel_spins s
         LEFT JOIN users u ON u.id = s.user_id
        WHERE s.discount_code_id IS NOT NULL`,
    );

    return Object.fromEntries(
      rows.map((row) => [
        String(row.discount_code_id),
        {
          customerName: String(row.customer_name ?? ""),
          customerPhone: String(row.customer_phone ?? ""),
          prizeName: String(row.prize_name ?? ""),
        },
      ]),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;

    // Chưa dùng vòng quay (thiếu bảng) hoặc bảng bản cũ chưa có cột discount_code_id.
    if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") {
      return {};
    }

    throw error;
  }
}
