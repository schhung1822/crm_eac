/* eslint-disable max-lines, no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { prisma2 } from "@/lib/prisma2";
import { getSrxDB } from "@/lib/srx-db";
import { withSrxReadFallback } from "@/lib/srx-db-errors";
import {
  parseSrxProductCategoryInput,
  parseSrxProductInput,
  parseSrxProductTagInput,
  srxProductBrandSchema,
  srxProductCategorySchema,
  srxProductSchema,
  srxProductStatusValues,
  srxProductTagGroupValues,
  srxProductTagSchema,
  type SrxProduct,
  type SrxProductBrand,
  type SrxProductCategory,
  type SrxProductCategoryMutationInput,
  type SrxProductMutationInput,
  type SrxProductTag,
  type SrxProductTagMutationInput,
  type SrxProductVariant,
  type SrxProductVariantMutationInput,
} from "@/lib/srx-products.shared";

import type { Prisma } from "../../prisma/generated/srx-app-client";

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeNullableBigInt(value: string | null | undefined): bigint | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? BigInt(trimmed) : null;
}

function asDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function slugify(value: string): string {
  return (
    value
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "unknown"
  );
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày giờ không hợp lệ");
  }

  return date;
}

type SrxProductTagGroup = (typeof srxProductTagGroupValues)[number];
type SrxProductVariantStatus = "active" | "inactive";

type SrxProductTagRow = RowDataPacket & {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  tag_groups: string | null;
  product_count: number | string | null;
  created_at: Date | string | null;
};

type ProductInfoImageRow = RowDataPacket & {
  id: string;
  info_img: string | null;
};

const srxProductTagGroupSet = new Set<SrxProductTagGroup>(srxProductTagGroupValues);

const srxProductTagsBaseQuery = `
  SELECT
    CAST(t.id AS CHAR) AS id,
    t.name,
    t.slug,
    t.\`desc\` AS description,
    t.img AS image_url,
    t.\`Tags\` AS tag_groups,
    t.created_at,
    COALESCE(tag_stats.product_count, 0) AS product_count
  FROM product_tags t
  LEFT JOIN (
    SELECT
      ptl.tag_id,
      COUNT(*) AS product_count
    FROM product_tag_links ptl
    INNER JOIN products p ON p.id = ptl.product_id
    WHERE p.deleted_at IS NULL
    GROUP BY ptl.tag_id
  ) tag_stats ON tag_stats.tag_id = t.id
`;

function normalizeTagGroups(value: string | null | undefined): SrxProductTagGroup[] {
  if (!value) {
    return [];
  }

  const selectedGroups = new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is SrxProductTagGroup => srxProductTagGroupSet.has(item as SrxProductTagGroup)),
  );

  return srxProductTagGroupValues.filter((item) => selectedGroups.has(item));
}

function serializeTagGroups(values: readonly SrxProductTagGroup[]): string | null {
  const selectedGroups = new Set(values);
  const orderedGroups = srxProductTagGroupValues.filter((item) => selectedGroups.has(item));

  return orderedGroups.length > 0 ? orderedGroups.join(",") : null;
}

function normalizeGalleryImageUrls(values: string[]): string[] {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

function validatePricing(basePrice: string, salePrice: string): void {
  if (!salePrice) {
    return;
  }

  if (Number(salePrice) > Number(basePrice)) {
    throw new Error("Giá khuyến mãi không được lớn hơn giá gốc");
  }
}

function validateVariantPricing(variant: SrxProductVariantMutationInput): void {
  if (!variant.sale_price) {
    return;
  }

  if (Number(variant.sale_price) > Number(variant.price)) {
    throw new Error(`Giá khuyến mãi của biến thể "${variant.sku}" không được lớn hơn giá gốc`);
  }
}

function normalizeProductVariants(variants: readonly SrxProductVariantMutationInput[]): SrxProductVariantMutationInput[] {
  const normalizedVariants = variants.map((variant) => ({
    ...variant,
    id: variant.id.trim(),
    sku: variant.sku.trim(),
    barcode: variant.barcode.trim(),
    variant_name: variant.variant_name.trim(),
    image_url: variant.image_url.trim(),
    weight_grams: variant.weight_grams.trim(),
  }));

  const duplicateSku = normalizedVariants.find(
    (variant, index) => normalizedVariants.findIndex((item) => item.sku === variant.sku) !== index,
  );

  if (duplicateSku) {
    throw new Error(`SKU biến thể bị trùng: ${duplicateSku.sku}`);
  }

  normalizedVariants.forEach(validateVariantPricing);

  const firstDefaultIndex = normalizedVariants.findIndex((variant) => variant.is_default);

  if (firstDefaultIndex >= 0) {
    return normalizedVariants.map((variant, index) => ({
      ...variant,
      is_default: index === firstDefaultIndex,
    }));
  }

  if (normalizedVariants.length === 0) {
    return normalizedVariants;
  }

  return normalizedVariants.map((variant, index) => ({
    ...variant,
    is_default: index === 0,
  }));
}

function mapBrand(brand: { id: bigint; name: string; slug: string; is_active: boolean }): SrxProductBrand {
  return srxProductBrandSchema.parse({
    id: brand.id.toString(),
    name: brand.name,
    slug: brand.slug,
    is_active: brand.is_active,
  });
}

function mapCategory(
  category: {
    id: bigint;
    parent_id: bigint | null;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    product_categories: { name: string } | null;
  },
  productCount = 0,
): SrxProductCategory {
  return srxProductCategorySchema.parse({
    id: category.id.toString(),
    parent_id: category.parent_id?.toString() ?? "",
    parent_name: category.product_categories?.name ?? "",
    name: category.name,
    slug: category.slug,
    description: normalizeOptionalString(category.description),
    image_url: normalizeOptionalString(category.image_url),
    is_active: category.is_active,
    sort_order: category.sort_order,
    product_count: productCount,
    created_at: category.created_at,
    updated_at: category.updated_at,
  });
}

function mapTag(tag: SrxProductTagRow): SrxProductTag {
  return srxProductTagSchema.parse({
    id: tag.id,
    name: normalizeOptionalString(tag.name),
    slug: normalizeOptionalString(tag.slug),
    description: normalizeOptionalString(tag.description),
    image_url: normalizeOptionalString(tag.image_url),
    tag_groups: normalizeTagGroups(tag.tag_groups),
    product_count: Number(tag.product_count ?? 0) || 0,
    created_at: asDate(tag.created_at) ?? new Date(0),
  });
}

async function getProductInfoImageMap(productIds: readonly bigint[]): Promise<Map<string, string>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const db = getSrxDB();
  const placeholders = productIds.map(() => "?").join(", ");
  const [rows] = await db.query<ProductInfoImageRow[]>(
    `
      SELECT CAST(id AS CHAR) AS id, info_img
      FROM products
      WHERE id IN (${placeholders})
    `,
    productIds.map((productId) => productId.toString()),
  );

  return new Map(rows.map((row) => [row.id, normalizeOptionalString(row.info_img)]));
}

function mapProductVariant(variant: {
  id: bigint;
  sku: string;
  barcode: string | null;
  variant_name: string | null;
  price: { toString(): string };
  sale_price: { toString(): string } | null;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  weight_grams: { toString(): string } | null;
  image_url: string | null;
  is_default: boolean;
  status: SrxProductVariantStatus;
  created_at: Date;
  updated_at: Date;
}): SrxProductVariant {
  return {
    id: variant.id.toString(),
    sku: variant.sku,
    barcode: normalizeOptionalString(variant.barcode),
    variant_name: normalizeOptionalString(variant.variant_name),
    price: Number(variant.price.toString()),
    sale_price: variant.sale_price ? Number(variant.sale_price.toString()) : null,
    stock_quantity: variant.stock_quantity,
    reserved_quantity: variant.reserved_quantity,
    low_stock_threshold: variant.low_stock_threshold,
    weight_grams: variant.weight_grams ? Number(variant.weight_grams.toString()) : null,
    image_url: normalizeOptionalString(variant.image_url),
    is_default: variant.is_default,
    status: variant.status,
    created_at: variant.created_at,
    updated_at: variant.updated_at,
  };
}

// Mapping này chủ yếu gom dữ liệu Prisma sang shape trả về cho UI.
// eslint-disable-next-line complexity
function mapProduct(product: {
  id: bigint;
  name: string;
  slug: string;
  product_code: string;
  short_description: string | null;
  description: string | null;
  usage_instructions: string | null;
  ingredient_list: string | null;
  status: (typeof srxProductStatusValues)[number];
  has_variants: boolean;
  is_featured: boolean;
  base_price: { toString(): string };
  sale_price: { toString(): string } | null;
  thumbnail_url: string | null;
  info_img: string | null;
  rating_average: { toString(): string };
  rating_count: number;
  sold_count: number;
  view_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  category_id: bigint | null;
  brand_id: bigint | null;
  product_categories: { name: string; slug: string } | null;
  brands: { name: string; slug: string } | null;
  product_tag_links: Array<{ product_tags: { id: bigint; name: string; slug: string } }>;
  product_images: Array<{
    id: bigint;
    image_url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
    created_at: Date;
  }>;
  product_variants?: Array<{
    id: bigint;
    sku: string;
    barcode: string | null;
    variant_name: string | null;
    price: { toString(): string };
    sale_price: { toString(): string } | null;
    stock_quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    weight_grams: { toString(): string } | null;
    image_url: string | null;
    is_default: boolean;
    status: SrxProductVariantStatus;
    created_at: Date;
    updated_at: Date;
  }>;
}): SrxProduct {
  const tags = product.product_tag_links.map(({ product_tags }) => ({
    id: product_tags.id.toString(),
    name: product_tags.name,
    slug: product_tags.slug,
  }));

  const galleryImages = product.product_images.map((image) => ({
    id: image.id.toString(),
    image_url: image.image_url,
    alt_text: normalizeOptionalString(image.alt_text),
    sort_order: image.sort_order,
    is_primary: image.is_primary,
    created_at: image.created_at,
  }));
  const variants = (product.product_variants ?? []).map(mapProductVariant);

  return srxProductSchema.parse({
    id: product.id.toString(),
    name: product.name,
    slug: product.slug,
    product_code: product.product_code,
    short_description: normalizeOptionalString(product.short_description),
    description: normalizeOptionalString(product.description),
    usage_instructions: normalizeOptionalString(product.usage_instructions),
    ingredient_list: normalizeOptionalString(product.ingredient_list),
    status: product.status,
    has_variants: product.has_variants,
    is_featured: product.is_featured,
    base_price: Number(product.base_price.toString()),
    sale_price: product.sale_price ? Number(product.sale_price.toString()) : null,
    thumbnail_url: normalizeOptionalString(product.thumbnail_url),
    info_img: normalizeOptionalString(product.info_img),
    rating_average: Number(product.rating_average.toString()),
    rating_count: product.rating_count,
    sold_count: product.sold_count,
    view_count: product.view_count,
    published_at: product.published_at,
    created_at: product.created_at,
    updated_at: product.updated_at,
    category_id: product.category_id?.toString() ?? "",
    category_name: product.product_categories?.name ?? "",
    category_slug: product.product_categories?.slug ?? "",
    brand_id: product.brand_id?.toString() ?? "",
    brand_name: product.brands?.name ?? "",
    brand_slug: product.brands?.slug ?? "",
    tag_ids: tags.map((tag) => tag.id),
    tags,
    gallery_images: galleryImages,
    variants,
  });
}

async function syncProductGalleryImages(
  tx: Prisma.TransactionClient,
  productId: bigint,
  productName: string,
  thumbnailUrl: string,
  galleryImageUrls: string[],
): Promise<void> {
  const normalizedGalleryImageUrls = normalizeGalleryImageUrls(galleryImageUrls);

  await tx.product_images.deleteMany({
    where: {
      product_id: productId,
      variant_id: null,
    },
  });

  if (normalizedGalleryImageUrls.length === 0) {
    return;
  }

  await tx.product_images.createMany({
    data: normalizedGalleryImageUrls.map((imageUrl, index) => ({
      product_id: productId,
      image_url: imageUrl,
      alt_text: productName,
      sort_order: index,
      is_primary: thumbnailUrl !== "" && imageUrl === thumbnailUrl,
    })),
  });
}

async function syncProductInfoImage(
  tx: Prisma.TransactionClient,
  productId: bigint,
  infoImageUrl: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    "UPDATE products SET info_img = ? WHERE id = ?",
    normalizeNullableString(infoImageUrl),
    productId.toString(),
  );
}

async function ensureUniqueProductVariantSkus(
  tx: Prisma.TransactionClient,
  variants: readonly SrxProductVariantMutationInput[],
  productId?: bigint,
): Promise<void> {
  if (variants.length === 0) {
    return;
  }

  const skuList = variants.map((variant) => variant.sku.trim());
  const variantIds = variants.flatMap((variant) => (variant.id ? [BigInt(variant.id)] : []));

  const conflicts = await tx.product_variants.findMany({
    where: {
      sku: {
        in: skuList,
      },
      ...(productId === undefined
        ? {}
        : {
            OR: [
              {
                product_id: {
                  not: productId,
                },
              },
              {
                id: {
                  notIn: variantIds,
                },
              },
            ],
          }),
    },
    select: {
      sku: true,
    },
  });

  if (conflicts.length > 0) {
    throw new Error(`SKU biến thể đã tồn tại: ${conflicts[0].sku}`);
  }
}

async function syncProductVariants(
  tx: Prisma.TransactionClient,
  productId: bigint,
  variants: readonly SrxProductVariantMutationInput[],
): Promise<void> {
  if (variants.length === 0) {
    await tx.product_variants.deleteMany({
      where: {
        product_id: productId,
      },
    });
    return;
  }

  await ensureUniqueProductVariantSkus(tx, variants, productId);

  const existingVariants = await tx.product_variants.findMany({
    where: {
      product_id: productId,
    },
    select: {
      id: true,
    },
  });

  const existingVariantIds = new Set(existingVariants.map((variant) => variant.id.toString()));
  const retainedVariantIds = variants.flatMap((variant) => (variant.id && existingVariantIds.has(variant.id) ? [BigInt(variant.id)] : []));

  await tx.product_variants.deleteMany({
    where: {
      product_id: productId,
      ...(retainedVariantIds.length > 0
        ? {
            id: {
              notIn: retainedVariantIds,
            },
          }
        : {}),
    },
  });

  for (const variant of variants) {
    const data = {
      sku: variant.sku.trim(),
      barcode: normalizeNullableString(variant.barcode),
      variant_name: normalizeNullableString(variant.variant_name),
      price: variant.price,
      sale_price: variant.sale_price || null,
      stock_quantity: Number(variant.stock_quantity),
      low_stock_threshold: Number(variant.low_stock_threshold),
      weight_grams: variant.weight_grams ? variant.weight_grams : null,
      image_url: normalizeNullableString(variant.image_url),
      is_default: variant.is_default,
      status: variant.status,
    };

    if (variant.id && existingVariantIds.has(variant.id)) {
      await tx.product_variants.update({
        where: {
          id: BigInt(variant.id),
        },
        data,
      });
      continue;
    }

    await tx.product_variants.create({
      data: {
        ...data,
        product_id: productId,
      },
    });
  }
}

async function ensureUniqueCategorySlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.product_categories.findFirst({
        where,
        select: { id: true },
      })
    )?.id;

    if (existingId === undefined) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueTagSlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  const db = getSrxDB();
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const params: Array<string | bigint> = [candidate];
    let query = `
      SELECT CAST(id AS CHAR) AS id
      FROM product_tags
      WHERE slug = ?
    `;

    if (excludeId !== undefined) {
      query += " AND id <> ?";
      params.push(excludeId);
    }

    query += " LIMIT 1";

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    if (rows.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueProductSlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.products.findFirst({
        where,
        select: { id: true },
      })
    )?.id;

    if (existingId === undefined) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueProductCode(productCode: string, excludeId?: bigint): Promise<void> {
  const normalizedCode = productCode.trim();
  const where =
    excludeId === undefined
      ? { product_code: normalizedCode }
      : { product_code: normalizedCode, NOT: { id: excludeId } };

  const existingId = (
    await prisma2.products.findFirst({
      where,
      select: { id: true },
    })
  )?.id;

  if (existingId !== undefined) {
    throw new Error("Mã sản phẩm đã tồn tại");
  }
}

export { parseSrxProductCategoryInput, parseSrxProductInput, parseSrxProductTagInput };

export async function getSrxProductBrands(): Promise<SrxProductBrand[]> {
  return withSrxReadFallback("product brands", [], async () => {
    const brands = await prisma2.brands.findMany({
      orderBy: [{ name: "asc" }],
    });

    return brands.map(mapBrand);
  });
}

export async function getSrxProductCategories(): Promise<SrxProductCategory[]> {
  return withSrxReadFallback("product categories", [], async () => {
    const [categories, productCounts] = await Promise.all([
      prisma2.product_categories.findMany({
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        include: {
          product_categories: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma2.products.groupBy({
        by: ["category_id"],
        where: {
          category_id: {
            not: null,
          },
          deleted_at: null,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const productCountMap = new Map(
      productCounts.flatMap((item) =>
        item.category_id === null ? [] : [[item.category_id.toString(), item._count._all]],
      ),
    );

    return categories.map((category) => mapCategory(category, productCountMap.get(category.id.toString()) ?? 0));
  });
}

export async function getSrxProductTags(): Promise<SrxProductTag[]> {
  return withSrxReadFallback("product tags", [], async () => {
    const db = getSrxDB();
    const [rows] = await db.query<SrxProductTagRow[]>(`
      ${srxProductTagsBaseQuery}
      ORDER BY t.name ASC
    `);

    return rows.map(mapTag);
  });
}

async function getSrxProductTagById(tagId: string): Promise<SrxProductTag | null> {
  const db = getSrxDB();
  const [rows] = await db.query<SrxProductTagRow[]>(
    `
      ${srxProductTagsBaseQuery}
      WHERE t.id = ?
      LIMIT 1
    `,
    [tagId],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapTag(rows[0]);
}

export async function getSrxProducts(): Promise<SrxProduct[]> {
  return withSrxReadFallback("products", [], async () => {
    const products = await prisma2.products.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: [{ created_at: "desc" }],
      include: {
        brands: true,
        product_categories: true,
        product_images: {
          where: {
            variant_id: null,
          },
          orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        },
        product_variants: {
          orderBy: [{ is_default: "desc" }, { created_at: "asc" }, { id: "asc" }],
        },
        product_tag_links: {
          include: {
            product_tags: true,
          },
        },
      },
    });
    const infoImageMap = await getProductInfoImageMap(products.map((product) => product.id));

    return products.map((product) =>
      mapProduct({
        ...product,
        status: product.status as (typeof srxProductStatusValues)[number],
        info_img: infoImageMap.get(product.id.toString()) ?? null,
      }),
    );
  });
}

export async function getSrxProductById(productId: string): Promise<SrxProduct | null> {
  return withSrxReadFallback("product detail", null, async () => {
    const product = await prisma2.products.findUnique({
      where: {
        id: BigInt(productId),
      },
      include: {
        brands: true,
        product_categories: true,
        product_images: {
          where: {
            variant_id: null,
          },
          orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        },
        product_variants: {
          orderBy: [{ is_default: "desc" }, { created_at: "asc" }, { id: "asc" }],
        },
        product_tag_links: {
          include: {
            product_tags: true,
          },
        },
      },
    });

    if (!product || product.deleted_at !== null) {
      return null;
    }
    const infoImageMap = await getProductInfoImageMap([product.id]);

    return mapProduct({
      ...product,
      status: product.status as (typeof srxProductStatusValues)[number],
      info_img: infoImageMap.get(product.id.toString()) ?? null,
    });
  });
}

export async function createSrxProductCategory(input: SrxProductCategoryMutationInput): Promise<SrxProductCategory> {
  const payload = parseSrxProductCategoryInput(input);
  const slug = await ensureUniqueCategorySlug(slugify(payload.slug || payload.name));

  const category = await prisma2.product_categories.create({
    data: {
      parent_id: normalizeNullableBigInt(payload.parent_id),
      name: payload.name,
      slug,
      description: normalizeNullableString(payload.description),
      image_url: normalizeNullableString(payload.image_url),
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    },
    include: {
      product_categories: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return mapCategory(category);
}

export async function updateSrxProductCategory(
  categoryId: string,
  input: SrxProductCategoryMutationInput,
): Promise<SrxProductCategory | null> {
  const payload = parseSrxProductCategoryInput(input);
  const numericId = BigInt(categoryId);

  if (payload.parent_id && payload.parent_id === categoryId) {
    throw new Error("Danh mục cha không được trùng với chính danh mục hiện tại");
  }

  const existing = await prisma2.product_categories.findUnique({
    where: { id: numericId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const slug = await ensureUniqueCategorySlug(slugify(payload.slug || payload.name), numericId);
  const category = await prisma2.product_categories.update({
    where: {
      id: numericId,
    },
    data: {
      parent_id: normalizeNullableBigInt(payload.parent_id),
      name: payload.name,
      slug,
      description: normalizeNullableString(payload.description),
      image_url: normalizeNullableString(payload.image_url),
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    },
    include: {
      product_categories: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return mapCategory(category);
}

export async function deleteSrxProductCategory(categoryId: string): Promise<void> {
  const numericId = BigInt(categoryId);

  const [category, childCategoryCount, activeProductCount] = await Promise.all([
    prisma2.product_categories.findUnique({
      where: { id: numericId },
      select: { id: true },
    }),
    prisma2.product_categories.count({
      where: { parent_id: numericId },
    }),
    prisma2.products.count({
      where: {
        category_id: numericId,
        deleted_at: null,
      },
    }),
  ]);

  if (!category) {
    throw new Error("Không tìm thấy danh mục sản phẩm");
  }

  if (childCategoryCount > 0) {
    throw new Error("Danh mục đang có danh mục con, không thể xóa");
  }

  if (activeProductCount > 0) {
    throw new Error("Danh mục vẫn còn sản phẩm liên kết, không thể xóa");
  }

  await prisma2.product_categories.delete({
    where: { id: numericId },
  });
}

export async function createSrxProductTag(input: SrxProductTagMutationInput): Promise<SrxProductTag> {
  const payload = parseSrxProductTagInput(input);
  const slug = await ensureUniqueTagSlug(slugify(payload.slug || payload.name));
  const db = getSrxDB();
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO product_tags (name, slug, \`desc\`, img, \`Tags\`)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      payload.name,
      slug,
      normalizeNullableString(payload.description),
      normalizeNullableString(payload.image_url),
      serializeTagGroups(payload.tag_groups),
    ],
  );

  const createdTag = await getSrxProductTagById(String(result.insertId));

  if (!createdTag) {
    throw new Error("Không thể tải lại thành phần vừa tạo");
  }

  return createdTag;
}

export async function updateSrxProductTag(
  tagId: string,
  input: SrxProductTagMutationInput,
): Promise<SrxProductTag | null> {
  const payload = parseSrxProductTagInput(input);
  const numericId = BigInt(tagId);
  const db = getSrxDB();
  const [existingRows] = await db.query<RowDataPacket[]>(
    `
      SELECT CAST(id AS CHAR) AS id
      FROM product_tags
      WHERE id = ?
      LIMIT 1
    `,
    [tagId],
  );

  if (existingRows.length === 0) {
    return null;
  }

  const slug = await ensureUniqueTagSlug(slugify(payload.slug || payload.name), numericId);
  await db.execute<ResultSetHeader>(
    `
      UPDATE product_tags
      SET
        name = ?,
        slug = ?,
        \`desc\` = ?,
        img = ?,
        \`Tags\` = ?
      WHERE id = ?
    `,
    [
      payload.name,
      slug,
      normalizeNullableString(payload.description),
      normalizeNullableString(payload.image_url),
      serializeTagGroups(payload.tag_groups),
      tagId,
    ],
  );

  return getSrxProductTagById(tagId);
}

export async function deleteSrxProductTag(tagId: string): Promise<void> {
  const db = getSrxDB();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        DELETE FROM product_tag_links
        WHERE tag_id = ?
      `,
      [tagId],
    );
    const [result] = await connection.execute<ResultSetHeader>(
      `
        DELETE FROM product_tags
        WHERE id = ?
      `,
      [tagId],
    );

    if (result.affectedRows === 0) {
      throw new Error("Không tìm thấy thành phần");
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createSrxProduct(input: SrxProductMutationInput): Promise<SrxProduct> {
  const payload = parseSrxProductInput(input);
  validatePricing(payload.base_price, payload.sale_price);
  await ensureUniqueProductCode(payload.product_code);

  const slug = await ensureUniqueProductSlug(slugify(payload.slug || payload.name));
  const tagIds = [...new Set(payload.tag_ids)].map((tagId) => BigInt(tagId));
  const galleryImageUrls = normalizeGalleryImageUrls(payload.gallery_image_urls);
  const variants = payload.has_variants ? normalizeProductVariants(payload.variants) : [];
  const publishedAt = payload.status === "active" ? (parseOptionalDate(payload.published_at) ?? new Date()) : null;

  const product = await prisma2.$transaction(async (tx) => {
    const createdProduct = await tx.products.create({
      data: {
        category_id: normalizeNullableBigInt(payload.category_id),
        brand_id: normalizeNullableBigInt(payload.brand_id),
        name: payload.name,
        slug,
        product_code: payload.product_code.trim(),
        short_description: normalizeNullableString(payload.short_description),
        description: normalizeNullableString(payload.description),
        usage_instructions: normalizeNullableString(payload.usage_instructions),
        ingredient_list: normalizeNullableString(payload.ingredient_list),
        status: payload.status,
        has_variants: payload.has_variants,
        is_featured: payload.is_featured,
        base_price: payload.base_price,
        sale_price: payload.sale_price || null,
        thumbnail_url: normalizeNullableString(payload.thumbnail_url),
        published_at: publishedAt,
        product_tag_links: tagIds.length
          ? {
              create: tagIds.map((tagId) => ({
                product_tags: {
                  connect: {
                    id: tagId,
                  },
                },
              })),
            }
          : undefined,
      },
    });

    await syncProductGalleryImages(
      tx,
      createdProduct.id,
      payload.name,
      normalizeOptionalString(payload.thumbnail_url),
      galleryImageUrls,
    );
    await syncProductInfoImage(tx, createdProduct.id, payload.info_img);
    await syncProductVariants(tx, createdProduct.id, variants);

    return tx.products.findUniqueOrThrow({
      where: {
        id: createdProduct.id,
      },
      include: {
        brands: true,
        product_categories: true,
        product_images: {
          where: {
            variant_id: null,
          },
          orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        },
        product_variants: {
          orderBy: [{ is_default: "desc" }, { created_at: "asc" }, { id: "asc" }],
        },
        product_tag_links: {
          include: {
            product_tags: true,
          },
        },
      },
    });
  });

  return mapProduct({
    ...product,
    status: product.status as (typeof srxProductStatusValues)[number],
    info_img: normalizeNullableString(payload.info_img),
  });
}

export async function updateSrxProduct(productId: string, input: SrxProductMutationInput): Promise<SrxProduct | null> {
  const payload = parseSrxProductInput(input);
  validatePricing(payload.base_price, payload.sale_price);

  const numericId = BigInt(productId);
  const existing = await prisma2.products.findUnique({
    where: { id: numericId },
    select: { id: true, published_at: true, deleted_at: true },
  });

  if (!existing || existing.deleted_at !== null) {
    return null;
  }

  await ensureUniqueProductCode(payload.product_code, numericId);

  const slug = await ensureUniqueProductSlug(slugify(payload.slug || payload.name), numericId);
  const tagIds = [...new Set(payload.tag_ids)].map((tagId) => BigInt(tagId));
  const galleryImageUrls = normalizeGalleryImageUrls(payload.gallery_image_urls);
  const variants = payload.has_variants ? normalizeProductVariants(payload.variants) : [];
  const publishedAt =
    payload.status === "active"
      ? (parseOptionalDate(payload.published_at) ?? existing.published_at ?? new Date())
      : null;

  await prisma2.$transaction(async (tx) => {
    await tx.product_tag_links.deleteMany({
      where: {
        product_id: numericId,
      },
    });

    await tx.products.update({
      where: {
        id: numericId,
      },
      data: {
        category_id: normalizeNullableBigInt(payload.category_id),
        brand_id: normalizeNullableBigInt(payload.brand_id),
        name: payload.name,
        slug,
        product_code: payload.product_code.trim(),
        short_description: normalizeNullableString(payload.short_description),
        description: normalizeNullableString(payload.description),
        usage_instructions: normalizeNullableString(payload.usage_instructions),
        ingredient_list: normalizeNullableString(payload.ingredient_list),
        status: payload.status,
        has_variants: payload.has_variants,
        is_featured: payload.is_featured,
        base_price: payload.base_price,
        sale_price: payload.sale_price || null,
        thumbnail_url: normalizeNullableString(payload.thumbnail_url),
        published_at: publishedAt,
      },
    });

    if (tagIds.length > 0) {
      await tx.product_tag_links.createMany({
        data: tagIds.map((tagId) => ({
          product_id: numericId,
          tag_id: tagId,
        })),
      });
    }

    await syncProductGalleryImages(
      tx,
      numericId,
      payload.name,
      normalizeOptionalString(payload.thumbnail_url),
      galleryImageUrls,
    );
    await syncProductInfoImage(tx, numericId, payload.info_img);
    await syncProductVariants(tx, numericId, variants);
  });

  return getSrxProductById(productId);
}

export async function deleteSrxProduct(productId: string): Promise<void> {
  const numericId = BigInt(productId);
  const existing = await prisma2.products.findUnique({
    where: { id: numericId },
    select: { id: true, deleted_at: true },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  await prisma2.products.update({
    where: {
      id: numericId,
    },
    data: {
      deleted_at: new Date(),
      status: "archived",
    },
  });
}
