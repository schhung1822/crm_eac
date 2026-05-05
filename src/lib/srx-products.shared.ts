import { z } from "zod";

const numericIdSchema = z.string().regex(/^\d+$/);
const optionalNumericIdSchema = z.string().trim().regex(/^\d+$/).or(z.literal("")).optional().default("");

function isValidNonNegativeNumber(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
}

function isValidNonNegativeInteger(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0;
}

export const srxProductStatusValues = ["draft", "active", "inactive", "archived"] as const;
export const srxProductStatusSchema = z.enum(srxProductStatusValues);
export const srxProductVariantStatusValues = ["active", "inactive"] as const;
export const srxProductVariantStatusSchema = z.enum(srxProductVariantStatusValues);
export const srxProductTagGroupValues = [
  "Tái tạo và Chống lão hóa",
  "Phục hồi và Củng cố hàng rào bảo vệ da",
  "Dưỡng sáng và Chống oxy hóa",
  "Yếu tố khác",
] as const;
export const srxProductTagGroupSchema = z.enum(srxProductTagGroupValues);

export const srxProductBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  is_active: z.boolean(),
});

export const srxProductCategorySchema = z.object({
  id: z.string(),
  parent_id: z.string(),
  parent_name: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  image_url: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
  product_count: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxProductTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  image_url: z.string(),
  tag_groups: z.array(srxProductTagGroupSchema),
  product_count: z.number(),
  created_at: z.coerce.date(),
});

export const srxProductPostTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const srxProductImageSchema = z.object({
  id: z.string(),
  image_url: z.string(),
  alt_text: z.string(),
  sort_order: z.number(),
  is_primary: z.boolean(),
  created_at: z.coerce.date(),
});

export const srxProductVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  barcode: z.string(),
  variant_name: z.string(),
  price: z.number(),
  sale_price: z.number().nullable(),
  stock_quantity: z.number(),
  reserved_quantity: z.number(),
  low_stock_threshold: z.number(),
  weight_grams: z.number().nullable(),
  image_url: z.string(),
  is_default: z.boolean(),
  status: srxProductVariantStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  product_code: z.string(),
  short_description: z.string(),
  description: z.string(),
  usage_instructions: z.string(),
  ingredient_list: z.string(),
  status: srxProductStatusSchema,
  has_variants: z.boolean(),
  is_featured: z.boolean(),
  base_price: z.number(),
  sale_price: z.number().nullable(),
  thumbnail_url: z.string(),
  info_img: z.string(),
  rating_average: z.number(),
  rating_count: z.number(),
  sold_count: z.number(),
  view_count: z.number(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  category_id: z.string(),
  category_name: z.string(),
  category_slug: z.string(),
  brand_id: z.string(),
  brand_name: z.string(),
  brand_slug: z.string(),
  tag_ids: z.array(z.string()),
  tags: z.array(srxProductPostTagSchema),
  gallery_images: z.array(srxProductImageSchema),
  variants: z.array(srxProductVariantSchema).default([]),
});

export type SrxProductBrand = z.infer<typeof srxProductBrandSchema>;
export type SrxProductCategory = z.infer<typeof srxProductCategorySchema>;
export type SrxProductTag = z.infer<typeof srxProductTagSchema>;
export type SrxProduct = z.infer<typeof srxProductSchema>;
export type SrxProductImage = z.infer<typeof srxProductImageSchema>;
export type SrxProductVariant = z.infer<typeof srxProductVariantSchema>;

const srxProductCategoryMutationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(150).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  image_url: z.string().trim().max(500).optional().default(""),
  parent_id: optionalNumericIdSchema,
  is_active: z.boolean().optional().default(true),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

const srxProductTagMutationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  image_url: z.string().trim().max(500).optional().default(""),
  tag_groups: z.array(srxProductTagGroupSchema).optional().default([]),
});

const priceStringSchema = z.string().trim().refine(isValidNonNegativeNumber, "Giá không hợp lệ");

const optionalPriceStringSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || isValidNonNegativeNumber(value), "Giá khuyến mãi không hợp lệ");

const quantityStringSchema = z.string().trim().refine(isValidNonNegativeInteger, "Số lượng không hợp lệ");

const optionalWeightStringSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || isValidNonNegativeNumber(value), "Khối lượng không hợp lệ");

const srxProductVariantMutationSchema = z.object({
  id: z.string().trim().regex(/^\d+$/).optional().default(""),
  sku: z.string().trim().min(1).max(100),
  barcode: z.string().trim().max(100).optional().default(""),
  variant_name: z.string().trim().max(200).optional().default(""),
  price: priceStringSchema,
  sale_price: optionalPriceStringSchema,
  stock_quantity: quantityStringSchema,
  low_stock_threshold: quantityStringSchema,
  weight_grams: optionalWeightStringSchema,
  image_url: z.string().trim().max(500).optional().default(""),
  is_default: z.boolean().optional().default(false),
  status: srxProductVariantStatusSchema.optional().default("active"),
});

const srxProductMutationSchema = z.object({
  name: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(220).optional().default(""),
  product_code: z.string().trim().min(1).max(50),
  short_description: z.string().trim().max(500).optional().default(""),
  description: z.string().optional().default(""),
  usage_instructions: z.string().trim().max(5000).optional().default(""),
  ingredient_list: z.string().trim().max(5000).optional().default(""),
  category_id: optionalNumericIdSchema,
  brand_id: optionalNumericIdSchema,
  tag_ids: z.array(numericIdSchema).optional().default([]),
  status: srxProductStatusSchema,
  has_variants: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
  base_price: priceStringSchema,
  sale_price: optionalPriceStringSchema,
  thumbnail_url: z.string().trim().max(500).optional().default(""),
  info_img: z.string().trim().max(500).optional().default(""),
  gallery_image_urls: z.array(z.string().trim().max(500)).optional().default([]),
  variants: z.array(srxProductVariantMutationSchema).optional().default([]),
  published_at: z.string().trim().optional().default(""),
});

export type SrxProductCategoryMutationInput = z.infer<typeof srxProductCategoryMutationSchema>;
export type SrxProductTagMutationInput = z.infer<typeof srxProductTagMutationSchema>;
export type SrxProductMutationInput = z.infer<typeof srxProductMutationSchema>;
export type SrxProductVariantMutationInput = z.infer<typeof srxProductVariantMutationSchema>;

export function parseSrxProductBrand(input: unknown): SrxProductBrand {
  return srxProductBrandSchema.parse(input);
}

export function parseSrxProductCategoryInput(input: unknown): SrxProductCategoryMutationInput {
  return srxProductCategoryMutationSchema.parse(input);
}

export function parseSrxProductCategory(input: unknown): SrxProductCategory {
  return srxProductCategorySchema.parse(input);
}

export function parseSrxProductTagInput(input: unknown): SrxProductTagMutationInput {
  return srxProductTagMutationSchema.parse(input);
}

export function parseSrxProductTag(input: unknown): SrxProductTag {
  return srxProductTagSchema.parse(input);
}

export function parseSrxProductInput(input: unknown): SrxProductMutationInput {
  return srxProductMutationSchema.parse(input);
}

export function parseSrxProduct(input: unknown): SrxProduct {
  return srxProductSchema.parse(input);
}
