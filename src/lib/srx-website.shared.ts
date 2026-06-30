import { z } from "zod";

export const srxDiscountCodeTypeValues = ["percentage", "fixed_amount", "free_shipping"] as const;
export const srxDiscountCodeTypeSchema = z.enum(srxDiscountCodeTypeValues);

export const srxDiscountCodeScopeValues = ["all_orders", "specific_products", "specific_categories"] as const;
export const srxDiscountCodeScopeSchema = z.enum(srxDiscountCodeScopeValues);

export const srxBannerLinkTypeValues = ["homepage", "product", "category", "post", "custom"] as const;
export const srxBannerLinkTypeSchema = z.enum(srxBannerLinkTypeValues);

export const srxBannerPositionValues = [
  "homepage_hero",
  "homepage_secondary",
  "category_sidebar",
  "popup",
  "header_strip",
  "banner_product",
] as const;
export const srxBannerPositionSchema = z.enum(srxBannerPositionValues);

export const srxPaymentMethodTypeValues = ["cod", "bank_transfer", "card", "e_wallet", "other"] as const;
export const srxPaymentMethodTypeSchema = z.enum(srxPaymentMethodTypeValues);

export const srxPaymentMethodFeeTypeValues = ["none", "fixed", "percentage"] as const;
export const srxPaymentMethodFeeTypeSchema = z.enum(srxPaymentMethodFeeTypeValues);

export const srxGiftRuleTypeValues = ["product_quantity", "order_subtotal"] as const;
export const srxGiftRuleTypeSchema = z.enum(srxGiftRuleTypeValues);

export const srxDiscountCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  discount_type: srxDiscountCodeTypeSchema,
  discount_value: z.number(),
  max_discount_amount: z.number().nullable(),
  min_order_amount: z.number().nullable(),
  total_usage_limit: z.number().nullable(),
  per_user_limit: z.number().nullable(),
  scope_type: srxDiscountCodeScopeSchema,
  starts_at: z.coerce.date().nullable(),
  ends_at: z.coerce.date().nullable(),
  is_active: z.boolean(),
  created_by_user_id: z.string(),
  created_by_name: z.string(),
  usage_count: z.number(),
  product_ids: z.array(z.string()),
  product_names: z.array(z.string()),
  category_ids: z.array(z.string()),
  category_names: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  image_url: z.string(),
  mobile_image_url: z.string(),
  alt_text: z.string(),
  button_label: z.string(),
  link_type: srxBannerLinkTypeSchema,
  link_target: z.string(),
  position: srxBannerPositionSchema,
  open_in_new_tab: z.boolean(),
  sort_order: z.number(),
  starts_at: z.coerce.date().nullable(),
  ends_at: z.coerce.date().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxPaymentMethodSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  provider: z.string(),
  method_type: srxPaymentMethodTypeSchema,
  instructions: z.string(),
  icon_url: z.string(),
  fee_type: srxPaymentMethodFeeTypeSchema,
  fee_value: z.number(),
  min_order_amount: z.number().nullable(),
  max_order_amount: z.number().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
  config_json: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxGiftRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  rule_type: srxGiftRuleTypeSchema,
  product_id: z.string(),
  product_name: z.string(),
  variant_id: z.string(),
  variant_name: z.string(),
  min_quantity: z.number(),
  min_subtotal: z.number(),
  gift_product_id: z.string(),
  gift_product_name: z.string(),
  gift_variant_id: z.string(),
  gift_sku: z.string(),
  gift_name: z.string(),
  gift_variant_name: z.string(),
  gift_quantity: z.number(),
  gift_img: z.string(),
  limit_quantity: z.number().nullable(),
  multiply_by_matched_quantity: z.boolean(),
  priority: z.number(),
  is_active: z.boolean(),
  starts_at: z.coerce.date().nullable(),
  ends_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type SrxDiscountCode = z.infer<typeof srxDiscountCodeSchema>;
export type SrxBanner = z.infer<typeof srxBannerSchema>;
export type SrxPaymentMethod = z.infer<typeof srxPaymentMethodSchema>;
export type SrxGiftRule = z.infer<typeof srxGiftRuleSchema>;

const srxDiscountCodeMutationSchema = z.object({
  code: z.string().trim().min(3).max(50),
  name: z.string().trim().min(3).max(150),
  description: z.string().trim().max(5000).optional().default(""),
  discount_type: srxDiscountCodeTypeSchema,
  discount_value: z.string().trim().min(1).max(40),
  max_discount_amount: z.string().trim().max(40).optional().default(""),
  min_order_amount: z.string().trim().max(40).optional().default(""),
  total_usage_limit: z.string().trim().max(10).optional().default(""),
  per_user_limit: z.string().trim().max(10).optional().default(""),
  scope_type: srxDiscountCodeScopeSchema,
  starts_at: z.string().trim().optional().default(""),
  ends_at: z.string().trim().optional().default(""),
  is_active: z.boolean().optional().default(true),
  product_ids: z.array(z.string().regex(/^\d+$/)).optional().default([]),
  category_ids: z.array(z.string().regex(/^\d+$/)).optional().default([]),
});

const srxBannerMutationSchema = z.object({
  title: z.string().trim().min(3).max(150),
  slug: z.string().trim().max(180).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  image_url: z.string().trim().min(1).max(500),
  mobile_image_url: z.string().trim().max(500).optional().default(""),
  alt_text: z.string().trim().max(255).optional().default(""),
  button_label: z.string().trim().max(80).optional().default(""),
  link_type: srxBannerLinkTypeSchema,
  link_target: z.string().trim().max(500).optional().default(""),
  position: srxBannerPositionSchema,
  open_in_new_tab: z.boolean().optional().default(false),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  starts_at: z.string().trim().optional().default(""),
  ends_at: z.string().trim().optional().default(""),
  is_active: z.boolean().optional().default(true),
});

const srxPaymentMethodMutationSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional().default(""),
  provider: z.string().trim().max(120).optional().default(""),
  method_type: srxPaymentMethodTypeSchema,
  instructions: z.string().trim().max(5000).optional().default(""),
  icon_url: z.string().trim().max(500).optional().default(""),
  fee_type: srxPaymentMethodFeeTypeSchema,
  fee_value: z.string().trim().min(1).max(40).optional().default("0"),
  min_order_amount: z.string().trim().max(40).optional().default(""),
  max_order_amount: z.string().trim().max(40).optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  is_active: z.boolean().optional().default(true),
  config_json: z.string().trim().max(20000).optional().default(""),
});

const srxGiftRuleMutationSchema = z.object({
  name: z.string().trim().min(3).max(150),
  description: z.string().trim().max(500).optional().default(""),
  rule_type: srxGiftRuleTypeSchema,
  product_id: z.string().regex(/^\d+$/).optional().or(z.literal("")).default(""),
  variant_id: z.string().regex(/^\d+$/).optional().or(z.literal("")).default(""),
  min_quantity: z.coerce.number().int().min(1).max(999_999).optional().default(1),
  min_subtotal: z.string().trim().max(40).optional().default("0"),
  gift_product_id: z.string().regex(/^\d+$/).optional().or(z.literal("")).default(""),
  gift_variant_id: z.string().regex(/^\d+$/).optional().or(z.literal("")).default(""),
  gift_sku: z.string().trim().max(100).optional().default(""),
  gift_name: z.string().trim().min(1).max(200),
  gift_variant_name: z.string().trim().max(200).optional().default(""),
  gift_quantity: z.coerce.number().int().min(1).max(999_999).optional().default(1),
  gift_img: z.string().trim().max(1000).optional().default(""),
  limit_quantity: z.string().trim().max(40).optional().default(""),
  multiply_by_matched_quantity: z.boolean().optional().default(false),
  priority: z.coerce.number().int().min(-9999).max(9999).optional().default(0),
  starts_at: z.string().trim().optional().default(""),
  ends_at: z.string().trim().optional().default(""),
  is_active: z.boolean().optional().default(true),
});

export type SrxDiscountCodeMutationInput = z.infer<typeof srxDiscountCodeMutationSchema>;
export type SrxBannerMutationInput = z.infer<typeof srxBannerMutationSchema>;
export type SrxPaymentMethodMutationInput = z.infer<typeof srxPaymentMethodMutationSchema>;
export type SrxGiftRuleMutationInput = z.infer<typeof srxGiftRuleMutationSchema>;

export function parseSrxDiscountCode(input: unknown): SrxDiscountCode {
  return srxDiscountCodeSchema.parse(input);
}

export function parseSrxBanner(input: unknown): SrxBanner {
  return srxBannerSchema.parse(input);
}

export function parseSrxPaymentMethod(input: unknown): SrxPaymentMethod {
  return srxPaymentMethodSchema.parse(input);
}

export function parseSrxGiftRule(input: unknown): SrxGiftRule {
  return srxGiftRuleSchema.parse(input);
}

export function parseSrxDiscountCodeInput(input: unknown): SrxDiscountCodeMutationInput {
  return srxDiscountCodeMutationSchema.parse(input);
}

export function parseSrxBannerInput(input: unknown): SrxBannerMutationInput {
  return srxBannerMutationSchema.parse(input);
}

export function parseSrxPaymentMethodInput(input: unknown): SrxPaymentMethodMutationInput {
  return srxPaymentMethodMutationSchema.parse(input);
}

export function parseSrxGiftRuleInput(input: unknown): SrxGiftRuleMutationInput {
  return srxGiftRuleMutationSchema.parse(input);
}
