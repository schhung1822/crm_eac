import type { RowDataPacket } from "mysql2";

import { productSchema, type Product } from "@/app/(main)/products/_components/schema";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

type ProductColumnRow = RowDataPacket & {
  Field: string;
};

type ProductQueryRow = RowDataPacket & {
  pro_ID: unknown;
  name: unknown;
  brand: unknown;
  class: unknown;
  gia_ban: unknown;
  gia_von: unknown;
  property: unknown;
  isActive: unknown;
  soldQuantity: unknown;
  salesRevenue: unknown;
};

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function buildSelectField(columns: Set<string>, alias: string, candidates: string[], fallbackSql: string): string {
  const column = pickColumn(columns, candidates);

  return column ? `p.\`${column}\` AS \`${alias}\`` : `${fallbackSql} AS \`${alias}\``;
}

function buildOrderBy(columns: Set<string>, candidates: string[], fallbackSql: string): string {
  const column = pickColumn(columns, candidates);

  return column ? `p.\`${column}\`` : fallbackSql;
}

function normalizeProductStatus(value: unknown): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toLocaleLowerCase("vi-VN");

  return ["1", "true", "active", "đang bán", "dang ban", "published"].includes(normalized);
}

async function getProductColumns(): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<ProductColumnRow[]>(`SHOW COLUMNS FROM ${legacyEacTables.product}`);

  return new Set(rows.map((row) => String(row.Field)));
}

export async function getProducts({ brands = [] }: { brands?: string[] } = {}): Promise<Product[]> {
  const db = getDB();
  const columns = await getProductColumns();
  const productIdColumn = pickColumn(columns, ["procode", "pro_ID", "product_ID", "product_id", "sku"]);
  const brandColumn = pickColumn(columns, ["brand", "brand_name", "thuong_hieu"]);
  const productIdFallback = columns.has("id") ? "CAST(p.`id` AS CHAR)" : "''";
  const productIdSql = productIdColumn ? `p.\`${productIdColumn}\`` : productIdFallback;
  const normalizedBrands = brands.map((brand) => brand.trim().toLocaleLowerCase("vi-VN")).filter(Boolean);
  const brandFilter = normalizedBrands.length
    ? brandColumn
      ? `WHERE LOWER(TRIM(COALESCE(p.\`${brandColumn}\`, ''))) IN (${normalizedBrands.map(() => "?").join(", ")})`
      : "WHERE 1 = 0"
    : "";

  const selectFields = [
    buildSelectField(columns, "pro_ID", ["procode", "pro_ID", "product_ID", "product_id", "sku"], productIdFallback),
    buildSelectField(columns, "name", ["name", "product_name", "ten_san_pham"], "''"),
    buildSelectField(columns, "brand", ["brand", "brand_name", "thuong_hieu"], "''"),
    buildSelectField(columns, "class", ["class", "categoryName", "product_class", "phan_loai"], "''"),
    buildSelectField(columns, "gia_ban", ["gia_ban", "basePrice", "price", "selling_price"], "0"),
    buildSelectField(columns, "gia_von", ["gia_von", "cost", "cost_price"], "0"),
    buildSelectField(columns, "property", ["property", "description", "note"], "''"),
    buildSelectField(columns, "isActive", ["isActive", "is_active", "active", "status"], "'1'"),
    "COALESCE(sales.soldQuantity, 0) AS `soldQuantity`",
    "COALESCE(sales.salesRevenue, 0) AS `salesRevenue`",
  ].join(",\n      ");

  const orderBy = buildOrderBy(columns, ["name", "product_name", "ten_san_pham", "id"], "1");

  const [rows] = await db.query<ProductQueryRow[]>(
    `
    SELECT
      ${selectFields}
    FROM ${legacyEacTables.product} p
    LEFT JOIN (
      SELECT
        TRIM(pro_ID) AS pro_ID,
        SUM(COALESCE(quantity, 0)) AS soldQuantity,
        SUM(COALESCE(thanh_tien, 0)) AS salesRevenue
      FROM ${legacyEacTables.orders}
      WHERE TRIM(status) = 'Hoàn thành'
      GROUP BY TRIM(pro_ID)
    ) sales ON sales.pro_ID = TRIM(${productIdSql})
    ${brandFilter}
    ORDER BY ${orderBy} ASC
    `,
    normalizedBrands,
  );

  return rows.map((row) =>
    productSchema.parse({
      pro_ID: String(row.pro_ID ?? ""),
      name: String(row.name ?? ""),
      brand: String(row.brand ?? ""),
      class: String(row.class ?? ""),
      gia_ban: Number(row.gia_ban) || 0,
      gia_von: Number(row.gia_von) || 0,
      property: row.property ? String(row.property) : "",
      isActive: normalizeProductStatus(row.isActive),
      soldQuantity: Number(row.soldQuantity) || 0,
      salesRevenue: Number(row.salesRevenue) || 0,
    }),
  );
}
