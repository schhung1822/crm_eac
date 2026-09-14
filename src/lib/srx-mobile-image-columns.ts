import "server-only";

import type { RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import { isMissingSrxTableError } from "@/lib/srx-db-errors";

type ColumnRow = RowDataPacket & {
  Field: string;
};

type MobileImageColumn = {
  /** Cột ảnh gốc, dùng để đặt cột mobile ngay sau nó cho dễ đọc schema. */
  after: string;
  column: string;
};

/**
 * Cột lưu đường dẫn bản mobile của từng bảng. Danh sách này là nguồn duy nhất
 * cho cả migration `sql/20260914_add_mobile_image_columns.sql` lẫn phần tự tạo
 * cột lúc chạy, nên hai bên không bao giờ lệch nhau.
 */
const MOBILE_IMAGE_COLUMNS = {
  banners: [{ after: "mobile_image_url", column: "image_url_mb" }],
  posts: [{ after: "featured_image_url", column: "featured_image_url_mb" }],
  product_images: [{ after: "image_url", column: "image_url_mb" }],
  product_tags: [{ after: "img", column: "img_mb" }],
  product_variants: [{ after: "image_url", column: "image_url_mb" }],
  products: [
    { after: "thumbnail_url", column: "thumbnail_url_mb" },
    { after: "info_img", column: "info_img_mb" },
  ],
} as const satisfies Record<string, readonly MobileImageColumn[]>;

export type MobileImageTable = keyof typeof MOBILE_IMAGE_COLUMNS;

const pendingByTable = new Map<MobileImageTable, Promise<void>>();

/** Hai tiến trình cùng ALTER một bảng thì tiến trình chậm hơn gặp lỗi trùng cột. */
function isDuplicateColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; errno?: number };

  return candidate.code === "ER_DUP_FIELDNAME" || candidate.errno === 1060;
}

async function addMissingColumns(table: MobileImageTable): Promise<void> {
  const definitions: readonly MobileImageColumn[] = MOBILE_IMAGE_COLUMNS[table];
  const db = getSrxDB();
  const [rows] = await db.query<ColumnRow[]>(
    `SHOW COLUMNS FROM \`${table}\` WHERE Field IN (${definitions.map(() => "?").join(", ")})`,
    definitions.map((definition) => definition.column),
  );
  const existingColumns = new Set(rows.map((row) => row.Field));

  for (const definition of definitions) {
    if (existingColumns.has(definition.column)) {
      continue;
    }

    try {
      // Tên bảng và tên cột lấy từ hằng số trong file này, không đến từ input.
      await db.execute(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${definition.column}\` VARCHAR(500) NULL AFTER \`${definition.after}\``,
      );
    } catch (error) {
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  }
}

/**
 * Bảo đảm bảng đã có cột ảnh mobile trước khi đọc hoặc ghi. Kết quả được nhớ
 * theo từng bảng nên mỗi tiến trình chỉ tốn một lần truy vấn.
 *
 * Bản cài đặt chưa import bảng website sẽ được bỏ qua trong im lặng: truy vấn
 * ngay sau đó tự báo lỗi thiếu bảng theo đúng luồng xử lý sẵn có.
 */
export async function ensureMobileImageColumns(table: MobileImageTable): Promise<void> {
  let task = pendingByTable.get(table);

  if (!task) {
    task = addMissingColumns(table).catch((error: unknown) => {
      if (isMissingSrxTableError(error)) {
        return;
      }

      // Xoá cache để lần gọi sau thử lại thay vì kẹt luôn ở lỗi cũ.
      pendingByTable.delete(table);
      throw error;
    });
    pendingByTable.set(table, task);
  }

  await task;
}
