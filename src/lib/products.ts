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
};

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((candidate) => columns.has(candidate)) ?? null;
}

function buildSelectField(columns: Set<string>, alias: string, candidates: string[], fallbackSql: string): string {
  const column = pickColumn(columns, candidates);

  return column ? `\`${column}\` AS \`${alias}\`` : `${fallbackSql} AS \`${alias}\``;
}

function buildOrderBy(columns: Set<string>, candidates: string[], fallbackSql: string): string {
  const column = pickColumn(columns, candidates);

  return column ? `\`${column}\`` : fallbackSql;
}

async function getProductColumns(): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<ProductColumnRow[]>(`SHOW COLUMNS FROM ${legacyEacTables.product}`);

  return new Set(rows.map((row) => String(row.Field)));
}

export async function getProducts(): Promise<Product[]> {
  const db = getDB();
  const columns = await getProductColumns();
  const productIdFallback = columns.has("id") ? "CAST(`id` AS CHAR)" : "''";

  const selectFields = [
    buildSelectField(columns, "pro_ID", ["procode", "pro_ID", "product_ID", "product_id", "sku"], productIdFallback),
    buildSelectField(columns, "name", ["name", "product_name", "ten_san_pham"], "''"),
    buildSelectField(columns, "brand", ["brand", "brand_name", "thuong_hieu"], "''"),
    buildSelectField(columns, "class", ["class", "product_class", "phan_loai"], "''"),
    buildSelectField(columns, "gia_ban", ["gia_ban", "price", "selling_price"], "0"),
    buildSelectField(columns, "gia_von", ["gia_von", "cost", "cost_price"], "0"),
    buildSelectField(columns, "property", ["property", "description", "note"], "''"),
  ].join(",\n      ");

  const orderBy = buildOrderBy(columns, ["name", "product_name", "ten_san_pham", "id"], "1");

  const [rows] = await db.query<ProductQueryRow[]>(
    `
    SELECT
      ${selectFields}
    FROM ${legacyEacTables.product}
    ORDER BY ${orderBy} ASC
    `,
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
    }),
  );
}
