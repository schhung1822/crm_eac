import "server-only";

import type { RowDataPacket } from "mysql2";

import { ensureMobileImageVariant } from "@/lib/image-mobile-variant";
import { getSrxDB } from "@/lib/srx-db";
import { ensureMobileImageColumns } from "@/lib/srx-mobile-image-columns";

type ProductImageRow = RowDataPacket & {
  id: string;
  image_url: string | null;
  image_url_mb: string | null;
};

type ProductMainImageRow = RowDataPacket & {
  id: string;
  info_img: string | null;
  info_img_mb: string | null;
  thumbnail_url: string | null;
  thumbnail_url_mb: string | null;
};

export type ProductMobileImageMaps = {
  /** `product_images.id` -> đường dẫn bản mobile. */
  galleryByImageId: Map<string, string>;
  /** `products.id` -> bản mobile của `info_img`. */
  infoImageByProductId: Map<string, string>;
  /** `products.id` -> bản mobile của `thumbnail_url`. */
  thumbnailByProductId: Map<string, string>;
  /** `product_variants.id` -> đường dẫn bản mobile. */
  variantByVariantId: Map<string, string>;
};

function createEmptyMaps(): ProductMobileImageMaps {
  return {
    galleryByImageId: new Map(),
    infoImageByProductId: new Map(),
    thumbnailByProductId: new Map(),
    variantByVariantId: new Map(),
  };
}

function toUrlMap(rows: readonly { id: string; image_url_mb: string | null }[]): Map<string, string> {
  return new Map(rows.flatMap((row) => (row.image_url_mb ? [[row.id, row.image_url_mb] as const] : [])));
}

async function queryChildImages(table: "product_images" | "product_variants", productIds: readonly string[]) {
  const db = getSrxDB();
  const placeholders = productIds.map(() => "?").join(", ");
  // Tên bảng lấy từ tham số kiểu literal, không đến từ dữ liệu người dùng.
  const [rows] = await db.query<ProductImageRow[]>(
    `
      SELECT CAST(id AS CHAR) AS id, image_url, image_url_mb
      FROM \`${table}\`
      WHERE product_id IN (${placeholders})
    `,
    productIds,
  );

  return rows;
}

async function readMobileImageMaps(productIds: readonly string[]): Promise<ProductMobileImageMaps> {
  const db = getSrxDB();
  const placeholders = productIds.map(() => "?").join(", ");
  const [[productRows], galleryRows, variantRows] = await Promise.all([
    db.query<ProductMainImageRow[]>(
      `
        SELECT CAST(id AS CHAR) AS id, thumbnail_url, thumbnail_url_mb, info_img, info_img_mb
        FROM products
        WHERE id IN (${placeholders})
      `,
      productIds,
    ),
    queryChildImages("product_images", productIds),
    queryChildImages("product_variants", productIds),
  ]);

  return {
    galleryByImageId: toUrlMap(galleryRows),
    infoImageByProductId: new Map(
      productRows.flatMap((row) => (row.info_img_mb ? [[row.id, row.info_img_mb] as const] : [])),
    ),
    thumbnailByProductId: new Map(
      productRows.flatMap((row) => (row.thumbnail_url_mb ? [[row.id, row.thumbnail_url_mb] as const] : [])),
    ),
    variantByVariantId: toUrlMap(variantRows),
  };
}

/**
 * Đọc toàn bộ đường dẫn ảnh mobile của một nhóm sản phẩm. Lỗi đọc chỉ làm mất
 * ảnh mobile chứ không được phép làm hỏng trang danh sách sản phẩm.
 */
export async function getProductMobileImageMaps(productIds: readonly bigint[]): Promise<ProductMobileImageMaps> {
  if (productIds.length === 0) {
    return createEmptyMaps();
  }

  try {
    await Promise.all([
      ensureMobileImageColumns("products"),
      ensureMobileImageColumns("product_images"),
      ensureMobileImageColumns("product_variants"),
    ]);

    return await readMobileImageMaps(productIds.map((productId) => productId.toString()));
  } catch (error) {
    console.error("Không thể đọc đường dẫn ảnh mobile của sản phẩm:", error);

    return createEmptyMaps();
  }
}

async function syncMainImages(productId: string, options: { force: boolean }): Promise<void> {
  const db = getSrxDB();
  const [rows] = await db.query<ProductMainImageRow[]>(
    `
      SELECT CAST(id AS CHAR) AS id, thumbnail_url, thumbnail_url_mb, info_img, info_img_mb
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId],
  );
  const row = rows[0];

  if (!row) {
    return;
  }

  const [thumbnailUrlMb, infoImageUrlMb] = await Promise.all([
    ensureMobileImageVariant(row.thumbnail_url, "product", options),
    ensureMobileImageVariant(row.info_img, "product", options),
  ]);

  await db.execute("UPDATE products SET thumbnail_url_mb = ?, info_img_mb = ? WHERE id = ?", [
    thumbnailUrlMb,
    infoImageUrlMb,
    productId,
  ]);
}

async function syncChildImages(
  table: "product_images" | "product_variants",
  productId: string,
  options: { force: boolean },
): Promise<void> {
  const db = getSrxDB();
  const rows = await queryChildImages(table, [productId]);

  for (const row of rows) {
    const mobileImageUrl = await ensureMobileImageVariant(row.image_url, "product", options);

    if (mobileImageUrl === row.image_url_mb) {
      continue;
    }

    // Tên bảng lấy từ tham số kiểu literal, không đến từ dữ liệu người dùng.
    await db.execute(`UPDATE \`${table}\` SET image_url_mb = ? WHERE id = ?`, [mobileImageUrl, row.id]);
  }
}

/**
 * Sinh bản 480px cho mọi ảnh của một sản phẩm (ảnh đại diện, ảnh mô tả, thư
 * viện ảnh, ảnh biến thể) rồi lưu đường dẫn vào các cột `*_mb`.
 *
 * Hàm đọc lại giá trị hiện có trong cơ sở dữ liệu nên phải chạy sau khi ghi
 * sản phẩm xong, và dùng được cả cho script backfill.
 */
export async function syncProductMobileImages(
  productId: bigint | string,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  const normalizedId = productId.toString();

  await Promise.all([
    ensureMobileImageColumns("products"),
    ensureMobileImageColumns("product_images"),
    ensureMobileImageColumns("product_variants"),
  ]);

  await syncMainImages(normalizedId, { force });
  await syncChildImages("product_images", normalizedId, { force });
  await syncChildImages("product_variants", normalizedId, { force });
}
