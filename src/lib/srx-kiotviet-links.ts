import "server-only";

import { prisma2 } from "@/lib/prisma2";
import type { SrxKiotVietLink, SrxKiotVietLinkView, SrxProductEacOption } from "@/lib/srx-kiotviet-links.shared";

let ensureTablePromise: Promise<unknown> | undefined;

// Giữ khớp với sql/20260928_create_kiotviet_tables.sql.
export function ensureProductKiotVietLinksTable(): Promise<unknown> {
  ensureTablePromise ??= prisma2
    .$executeRawUnsafe(
      `
        CREATE TABLE IF NOT EXISTS product_kiotviet_links (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          product_id BIGINT UNSIGNED NOT NULL,
          variant_id BIGINT UNSIGNED NULL,
          procode VARCHAR(100) NOT NULL,
          quantity INT UNSIGNED NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_product_kiotviet_links_product (product_id),
          KEY idx_product_kiotviet_links_variant (variant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
    )
    .catch((error: unknown) => {
      ensureTablePromise = undefined;
      throw error;
    });

  return ensureTablePromise;
}

type ProductEacRow = {
  procode: string;
  name: string | null;
  basePrice: bigint | number | null;
  isActive: string | null;
};

function toEacOption(row: ProductEacRow): SrxProductEacOption {
  return {
    procode: row.procode,
    name: row.name ?? "",
    base_price: Number(row.basePrice ?? 0),
    is_active: row.isActive === "1",
  };
}

/** Tìm sản phẩm KiotViet (bảng product_eac) theo mã hàng, mã vạch hoặc tên; hàng đang kinh doanh lên trước. */
export async function searchProductEac(query: string, limit = 20): Promise<SrxProductEacOption[]> {
  const keyword = query.trim();

  if (!keyword) {
    return [];
  }

  const pattern = `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await prisma2.$queryRawUnsafe<ProductEacRow[]>(
    `
      SELECT procode, name, basePrice, isActive
      FROM product_eac
      WHERE procode IS NOT NULL AND procode <> ''
        AND (procode LIKE ? OR barcode LIKE ? OR name LIKE ?)
      ORDER BY (procode = ?) DESC, (isActive = '1') DESC, name ASC
      LIMIT ${Math.min(50, Math.max(1, Math.floor(limit)))}
    `,
    pattern,
    pattern,
    pattern,
    keyword,
  );

  return rows.map(toEacOption);
}

/** Thông tin product_eac theo mã hàng; mã trùng nhiều dòng thì ưu tiên dòng đang kinh doanh. */
export async function getProductEacByCodes(codes: string[]): Promise<Map<string, SrxProductEacOption>> {
  const uniqueCodes = [...new Set(codes.map((code) => code.trim()).filter(Boolean))];
  const result = new Map<string, SrxProductEacOption>();

  if (uniqueCodes.length === 0) {
    return result;
  }

  const rows = await prisma2.$queryRawUnsafe<ProductEacRow[]>(
    `
      SELECT procode, name, basePrice, isActive
      FROM product_eac
      WHERE procode IN (${uniqueCodes.map(() => "?").join(", ")})
      ORDER BY (isActive = '1') DESC, id DESC
    `,
    ...uniqueCodes,
  );

  for (const row of rows) {
    if (!result.has(row.procode)) {
      result.set(row.procode, toEacOption(row));
    }
  }

  return result;
}

type LinkRow = { procode: string; quantity: number | bigint; variant_sku: string | null };

export async function getProductKiotVietLinks(productId: string): Promise<SrxKiotVietLinkView[]> {
  await ensureProductKiotVietLinksTable();

  const rows = await prisma2.$queryRawUnsafe<LinkRow[]>(
    `
      SELECT l.procode, l.quantity, v.sku AS variant_sku
      FROM product_kiotviet_links l
      LEFT JOIN product_variants v ON v.id = l.variant_id
      WHERE l.product_id = ?
      ORDER BY l.variant_id IS NOT NULL, l.variant_id, l.sort_order, l.id
    `,
    BigInt(productId),
  );
  const eacByCode = await getProductEacByCodes(rows.map((row) => row.procode));

  return rows.map((row) => ({
    variant_sku: row.variant_sku ?? "",
    procode: row.procode,
    quantity: Number(row.quantity),
    eac: eacByCode.get(row.procode) ?? null,
  }));
}

/** Ghi đè toàn bộ liên kết của một sản phẩm. Biến thể xác định theo SKU (biến thể mới chưa có ID ở form). */
export async function saveProductKiotVietLinks(productId: string, links: SrxKiotVietLink[]): Promise<void> {
  await ensureProductKiotVietLinksTable();

  const variants = await prisma2.product_variants.findMany({
    where: { product_id: BigInt(productId) },
    select: { id: true, sku: true },
  });
  const variantIdBySku = new Map(variants.map((variant) => [variant.sku, variant.id]));
  const rows = links.map((link, index) => {
    const variantId = link.variant_sku ? variantIdBySku.get(link.variant_sku) : null;

    if (variantId === undefined) {
      throw new Error(`Không tìm thấy biến thể có SKU "${link.variant_sku}" của sản phẩm này`);
    }

    return { ...link, variantId, sortOrder: index };
  });

  await prisma2.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("DELETE FROM product_kiotviet_links WHERE product_id = ?", BigInt(productId));

    for (const row of rows) {
      await tx.$executeRawUnsafe(
        "INSERT INTO product_kiotviet_links (product_id, variant_id, procode, quantity, sort_order) VALUES (?, ?, ?, ?, ?)",
        BigInt(productId),
        row.variantId,
        row.procode,
        row.quantity,
        row.sortOrder,
      );
    }
  });
}

export type OrderItemLinkKey = { productId: bigint | null; variantId: bigint | null };

/**
 * Liên kết cho từng dòng đơn: liên kết riêng của biến thể nếu có, không thì liên kết chung của sản phẩm.
 * Trả về mảng rỗng khi dòng đơn chưa được liên kết.
 */
export async function getKiotVietLinksForOrderItems(
  items: OrderItemLinkKey[],
): Promise<{ procode: string; quantity: number }[][]> {
  await ensureProductKiotVietLinksTable();

  const productIds = [...new Set(items.map((item) => item.productId).filter((id): id is bigint => id !== null))];

  if (productIds.length === 0) {
    return items.map(() => []);
  }

  const rows = await prisma2.$queryRawUnsafe<
    { product_id: bigint; variant_id: bigint | null; procode: string; quantity: number | bigint }[]
  >(
    `
      SELECT product_id, variant_id, procode, quantity
      FROM product_kiotviet_links
      WHERE product_id IN (${productIds.map(() => "?").join(", ")})
      ORDER BY sort_order, id
    `,
    ...productIds,
  );

  const pick = (productId: bigint, variantId: bigint | null) =>
    rows
      .filter((row) => row.product_id === productId && row.variant_id === variantId)
      .map((row) => ({ procode: row.procode, quantity: Number(row.quantity) }));

  return items.map((item) => {
    if (item.productId === null) {
      return [];
    }

    const variantLinks = item.variantId === null ? [] : pick(item.productId, item.variantId);
    return variantLinks.length > 0 ? variantLinks : pick(item.productId, null);
  });
}
