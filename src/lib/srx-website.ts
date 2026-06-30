/* eslint-disable max-lines, no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import "server-only";

import { prisma2 } from "@/lib/prisma2";
import {
  resolveNullableSiteAssetUrlForStorage,
  resolveSiteAssetUrl,
  resolveSiteAssetUrlForStorage,
} from "@/lib/site-asset-url";
import {
  parseSrxBannerInput,
  parseSrxDiscountCodeInput,
  parseSrxGiftRuleInput,
  parseSrxPaymentMethodInput,
  srxBannerSchema,
  srxDiscountCodeScopeValues,
  srxDiscountCodeSchema,
  srxDiscountCodeTypeValues,
  srxGiftRuleSchema,
  srxGiftRuleTypeValues,
  srxPaymentMethodFeeTypeValues,
  srxPaymentMethodTypeValues,
  srxPaymentMethodSchema,
  type SrxBanner,
  type SrxBannerMutationInput,
  type SrxDiscountCode,
  type SrxDiscountCodeMutationInput,
  type SrxGiftRule,
  type SrxGiftRuleMutationInput,
  type SrxPaymentMethod,
  type SrxPaymentMethodMutationInput,
} from "@/lib/srx-website.shared";

import { Prisma } from "../../prisma/generated/srx-app-client";

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
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

function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeCodeToken(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "code"
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

function parseRequiredDecimalString(value: string, label: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} là bắt buộc`);
  }

  const numeric = Number(trimmed);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${label} không hợp lệ`);
  }

  return trimmed;
}

function parseOptionalDecimalString(value: string | null | undefined, label: string): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${label} không hợp lệ`);
  }

  return trimmed;
}

function parseOptionalBigIntId(value: string | null | undefined): bigint | null {
  const trimmed = value?.trim() ?? "";

  return trimmed ? BigInt(trimmed) : null;
}

function parseOptionalUnsignedInt(value: string | null | undefined, label: string): number | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);

  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} phải là số nguyên không âm`);
  }

  return numeric;
}

function parseOptionalJson(
  value: string | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return Prisma.DbNull;
  }

  try {
    return JSON.parse(trimmed) as Prisma.InputJsonValue;
  } catch {
    throw new Error("Cấu hình JSON không hợp lệ");
  }
}

function toNumber(value: { toString(): string } | number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(typeof value === "number" ? value : value.toString());
}

function normalizeIdArray(values: string[]): bigint[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].map((value) => BigInt(value));
}

function validateDateRange(startsAt: Date | null, endsAt: Date | null): void {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("Thời gian bắt đầu không được sau thời gian kết thúc");
  }
}

function validateDiscountCodePayload(payload: SrxDiscountCodeMutationInput): {
  categoryIds: bigint[];
  discountValue: string;
  endsAt: Date | null;
  maxDiscountAmount: string | null;
  minOrderAmount: string | null;
  perUserLimit: number | null;
  productIds: bigint[];
  startsAt: Date | null;
  totalUsageLimit: number | null;
} {
  const discountValue = parseRequiredDecimalString(payload.discount_value, "Giá trị giảm");
  const maxDiscountAmount = parseOptionalDecimalString(payload.max_discount_amount, "Mức giảm tối đa");
  const minOrderAmount = parseOptionalDecimalString(payload.min_order_amount, "Đơn tối thiểu");
  const totalUsageLimit = parseOptionalUnsignedInt(payload.total_usage_limit, "Giới hạn tổng lượt dùng");
  const perUserLimit = parseOptionalUnsignedInt(payload.per_user_limit, "Giới hạn mỗi khách");
  const startsAt = parseOptionalDate(payload.starts_at);
  const endsAt = parseOptionalDate(payload.ends_at);

  validateDateRange(startsAt, endsAt);

  if (payload.discount_type === "percentage") {
    const percentageValue = Number(discountValue);

    if (percentageValue <= 0 || percentageValue > 100) {
      throw new Error("Giảm theo phần trăm phải nằm trong khoảng 0 - 100");
    }
  }

  const productIds = payload.scope_type === "specific_products" ? normalizeIdArray(payload.product_ids) : [];
  const categoryIds = payload.scope_type === "specific_categories" ? normalizeIdArray(payload.category_ids) : [];

  if (payload.scope_type === "specific_products" && productIds.length === 0) {
    throw new Error("Hãy chọn ít nhất một sản phẩm áp dụng");
  }

  if (payload.scope_type === "specific_categories" && categoryIds.length === 0) {
    throw new Error("Hãy chọn ít nhất một danh mục áp dụng");
  }

  return {
    categoryIds,
    discountValue,
    endsAt,
    maxDiscountAmount,
    minOrderAmount,
    perUserLimit,
    productIds,
    startsAt,
    totalUsageLimit,
  };
}

function validateGiftRulePayload(payload: SrxGiftRuleMutationInput): {
  endsAt: Date | null;
  giftProductId: bigint | null;
  giftVariantId: bigint | null;
  limitQuantity: number | null;
  minSubtotal: string;
  productId: bigint | null;
  startsAt: Date | null;
  variantId: bigint | null;
} {
  const startsAt = parseOptionalDate(payload.starts_at);
  const endsAt = parseOptionalDate(payload.ends_at);
  const minSubtotal = parseRequiredDecimalString(payload.min_subtotal || "0", "Gi\u00e1 tr\u1ecb \u0111\u01a1n t\u1ed1i thi\u1ec3u");
  const limitQuantity = parseOptionalUnsignedInt(payload.limit_quantity, "Gi\u1edbi h\u1ea1n s\u1ed1 l\u01b0\u1ee3ng qu\u00e0");
  const productId = parseOptionalBigIntId(payload.product_id);
  const variantId = parseOptionalBigIntId(payload.variant_id);
  const giftProductId = parseOptionalBigIntId(payload.gift_product_id);
  const giftVariantId = parseOptionalBigIntId(payload.gift_variant_id);

  validateDateRange(startsAt, endsAt);


  if (payload.rule_type === "order_subtotal" && Number(minSubtotal) <= 0) {
    throw new Error("Gi\u00e1 tr\u1ecb \u0111\u01a1n t\u1ed1i thi\u1ec3u ph\u1ea3i l\u1edbn h\u01a1n 0");
  }

  return {
    endsAt,
    giftProductId,
    giftVariantId,
    limitQuantity,
    minSubtotal: payload.rule_type === "product_quantity" ? "0" : minSubtotal,
    productId: payload.rule_type === "product_quantity" ? productId : null,
    startsAt,
    variantId: payload.rule_type === "product_quantity" && productId ? variantId : null,
  };
}

function validatePaymentMethodPayload(payload: SrxPaymentMethodMutationInput): {
  feeValue: string;
  maxOrderAmount: string | null;
  minOrderAmount: string | null;
  parsedConfigJson: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
} {
  const feeValue = parseRequiredDecimalString(payload.fee_value, "Phí thanh toán");
  const minOrderAmount = parseOptionalDecimalString(payload.min_order_amount, "Đơn tối thiểu");
  const maxOrderAmount = parseOptionalDecimalString(payload.max_order_amount, "Đơn tối đa");
  const parsedConfigJson = parseOptionalJson(payload.config_json);

  if (payload.fee_type === "percentage") {
    const percentageValue = Number(feeValue);

    if (percentageValue < 0 || percentageValue > 100) {
      throw new Error("Phí phần trăm phải nằm trong khoảng 0 - 100");
    }
  }

  if (minOrderAmount && maxOrderAmount && Number(minOrderAmount) > Number(maxOrderAmount)) {
    throw new Error("Đơn tối thiểu không được lớn hơn đơn tối đa");
  }

  return {
    feeValue: payload.fee_type === "none" ? "0" : feeValue,
    maxOrderAmount,
    minOrderAmount,
    parsedConfigJson,
  };
}

function isMissingWebsiteTableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function wrapMissingTableError(error: unknown): never {
  if (isMissingWebsiteTableError(error)) {
    throw new Error("Thiếu bảng quản trị website SRX. Hãy import file SQL trước khi sử dụng chức năng này.");
  }

  throw error;
}

function mapDiscountCode(discountCode: {
  id: bigint;
  code: string;
  name: string;
  description: string | null;
  discount_type: (typeof srxDiscountCodeTypeValues)[number];
  discount_value: { toString(): string };
  max_discount_amount: { toString(): string } | null;
  min_order_amount: { toString(): string } | null;
  total_usage_limit: number | null;
  per_user_limit: number | null;
  scope_type: (typeof srxDiscountCodeScopeValues)[number];
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean;
  created_by_user_id: bigint | null;
  created_at: Date;
  updated_at: Date;
  users: { full_name: string } | null;
  discount_code_product_links: Array<{ products: { id: bigint; name: string } }>;
  discount_code_category_links: Array<{ product_categories: { id: bigint; name: string } }>;
  discount_code_redemptions: Array<{ id: bigint }>;
}): SrxDiscountCode {
  const productReferences = discountCode.discount_code_product_links.map(({ products }) => products);
  const categoryReferences = discountCode.discount_code_category_links.map(
    ({ product_categories }) => product_categories,
  );

  return srxDiscountCodeSchema.parse({
    id: discountCode.id.toString(),
    code: discountCode.code,
    name: discountCode.name,
    description: normalizeOptionalString(discountCode.description),
    discount_type: discountCode.discount_type,
    discount_value: Number(discountCode.discount_value.toString()),
    max_discount_amount: toNumber(discountCode.max_discount_amount),
    min_order_amount: toNumber(discountCode.min_order_amount),
    total_usage_limit: discountCode.total_usage_limit,
    per_user_limit: discountCode.per_user_limit,
    scope_type: discountCode.scope_type,
    starts_at: discountCode.starts_at,
    ends_at: discountCode.ends_at,
    is_active: discountCode.is_active,
    created_by_user_id: discountCode.created_by_user_id?.toString() ?? "",
    created_by_name: discountCode.users?.full_name ?? "",
    usage_count: discountCode.discount_code_redemptions.length,
    product_ids: productReferences.map((item) => item.id.toString()),
    product_names: productReferences.map((item) => item.name),
    category_ids: categoryReferences.map((item) => item.id.toString()),
    category_names: categoryReferences.map((item) => item.name),
    created_at: discountCode.created_at,
    updated_at: discountCode.updated_at,
  });
}

function mapBanner(banner: {
  id: bigint;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string | null;
  button_label: string | null;
  link_type: string;
  link_target: string | null;
  position: string;
  open_in_new_tab: boolean | number;
  sort_order: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean | number;
  created_at: Date;
  updated_at: Date;
}): SrxBanner {
  return srxBannerSchema.parse({
    id: banner.id.toString(),
    title: banner.title,
    slug: banner.slug,
    description: normalizeOptionalString(banner.description),
    image_url: resolveSiteAssetUrl(banner.image_url),
    mobile_image_url: resolveSiteAssetUrl(banner.mobile_image_url),
    alt_text: normalizeOptionalString(banner.alt_text),
    button_label: normalizeOptionalString(banner.button_label),
    link_type: banner.link_type,
    link_target: normalizeOptionalString(banner.link_target),
    position: banner.position,
    open_in_new_tab: Boolean(banner.open_in_new_tab),
    sort_order: banner.sort_order,
    starts_at: banner.starts_at,
    ends_at: banner.ends_at,
    is_active: Boolean(banner.is_active),
    created_at: banner.created_at,
    updated_at: banner.updated_at,
  });
}

type BannerQueryClient = Pick<typeof prisma2, "$executeRaw" | "$queryRaw">;

type BannerRow = {
  id: bigint;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string | null;
  button_label: string | null;
  link_type: string;
  link_target: string | null;
  position: string;
  open_in_new_tab: boolean | number;
  sort_order: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean | number;
  created_at: Date;
  updated_at: Date;
};

async function getBannerByIdRaw(bannerId: bigint, client: BannerQueryClient = prisma2): Promise<BannerRow | null> {
  const banners = await client.$queryRaw<BannerRow[]>(Prisma.sql`
    SELECT
      id,
      title,
      slug,
      description,
      image_url,
      mobile_image_url,
      alt_text,
      button_label,
      link_type,
      link_target,
      position,
      open_in_new_tab,
      sort_order,
      starts_at,
      ends_at,
      is_active,
      created_at,
      updated_at
    FROM banners
    WHERE id = ${bannerId}
    LIMIT 1
  `);

  return banners[0] ?? null;
}

async function getBannerBySlugRaw(slug: string, client: BannerQueryClient = prisma2): Promise<BannerRow | null> {
  const banners = await client.$queryRaw<BannerRow[]>(Prisma.sql`
    SELECT
      id,
      title,
      slug,
      description,
      image_url,
      mobile_image_url,
      alt_text,
      button_label,
      link_type,
      link_target,
      position,
      open_in_new_tab,
      sort_order,
      starts_at,
      ends_at,
      is_active,
      created_at,
      updated_at
    FROM banners
    WHERE slug = ${slug}
    LIMIT 1
  `);

  return banners[0] ?? null;
}

function mapPaymentMethod(paymentMethod: {
  id: bigint;
  code: string;
  name: string;
  description: string | null;
  provider: string | null;
  method_type: (typeof srxPaymentMethodTypeValues)[number];
  instructions: string | null;
  icon_url: string | null;
  fee_type: (typeof srxPaymentMethodFeeTypeValues)[number];
  fee_value: { toString(): string };
  min_order_amount: { toString(): string } | null;
  max_order_amount: { toString(): string } | null;
  sort_order: number;
  is_active: boolean;
  config_json: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
}): SrxPaymentMethod {
  return srxPaymentMethodSchema.parse({
    id: paymentMethod.id.toString(),
    code: paymentMethod.code,
    name: paymentMethod.name,
    description: normalizeOptionalString(paymentMethod.description),
    provider: normalizeOptionalString(paymentMethod.provider),
    method_type: paymentMethod.method_type,
    instructions: normalizeOptionalString(paymentMethod.instructions),
    icon_url: resolveSiteAssetUrl(paymentMethod.icon_url),
    fee_type: paymentMethod.fee_type,
    fee_value: Number(paymentMethod.fee_value.toString()),
    min_order_amount: toNumber(paymentMethod.min_order_amount),
    max_order_amount: toNumber(paymentMethod.max_order_amount),
    sort_order: paymentMethod.sort_order,
    is_active: paymentMethod.is_active,
    config_json: paymentMethod.config_json === null ? "" : JSON.stringify(paymentMethod.config_json, null, 2),
    created_at: paymentMethod.created_at,
    updated_at: paymentMethod.updated_at,
  });
}

type GiftRuleQueryClient = Pick<typeof prisma2, "$executeRaw" | "$queryRaw">;

type GiftRuleRow = {
  id: bigint;
  name: string;
  description: string | null;
  rule_type: (typeof srxGiftRuleTypeValues)[number];
  product_id: bigint | null;
  product_name: string | null;
  variant_id: bigint | null;
  variant_name: string | null;
  min_quantity: bigint | number;
  min_subtotal: { toString(): string } | number;
  gift_product_id: bigint | null;
  gift_product_name: string | null;
  gift_variant_id: bigint | null;
  gift_sku: string | null;
  gift_name: string;
  gift_variant_name: string | null;
  gift_quantity: bigint | number;
  gift_img: string | null;
  limit_quantity: bigint | number | null;
  multiply_by_matched_quantity: boolean | number;
  priority: bigint | number;
  is_active: boolean | number;
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapGiftRule(giftRule: GiftRuleRow): SrxGiftRule {
  return srxGiftRuleSchema.parse({
    id: giftRule.id.toString(),
    name: giftRule.name,
    description: normalizeOptionalString(giftRule.description),
    rule_type: giftRule.rule_type,
    product_id: giftRule.product_id?.toString() ?? "",
    product_name: normalizeOptionalString(giftRule.product_name),
    variant_id: giftRule.variant_id?.toString() ?? "",
    variant_name: normalizeOptionalString(giftRule.variant_name),
    min_quantity: Number(giftRule.min_quantity.toString()),
    min_subtotal: Number(giftRule.min_subtotal.toString()),
    gift_product_id: giftRule.gift_product_id?.toString() ?? "",
    gift_product_name: normalizeOptionalString(giftRule.gift_product_name),
    gift_variant_id: giftRule.gift_variant_id?.toString() ?? "",
    gift_sku: normalizeOptionalString(giftRule.gift_sku),
    gift_name: giftRule.gift_name,
    gift_variant_name: normalizeOptionalString(giftRule.gift_variant_name),
    gift_quantity: Number(giftRule.gift_quantity.toString()),
    gift_img: resolveSiteAssetUrl(giftRule.gift_img),
    limit_quantity: giftRule.limit_quantity === null ? null : Number(giftRule.limit_quantity.toString()),
    multiply_by_matched_quantity: Boolean(giftRule.multiply_by_matched_quantity),
    priority: Number(giftRule.priority.toString()),
    is_active: Boolean(giftRule.is_active),
    starts_at: giftRule.starts_at,
    ends_at: giftRule.ends_at,
    created_at: giftRule.created_at,
    updated_at: giftRule.updated_at,
  });
}

const giftRuleSelectSql = Prisma.sql`
  SELECT
    gr.id,
    gr.name,
    gr.description,
    gr.rule_type,
    gr.product_id,
    condition_product.name AS product_name,
    gr.variant_id,
    condition_variant.variant_name AS variant_name,
    gr.min_quantity,
    gr.min_subtotal,
    gr.gift_product_id,
    gift_product.name AS gift_product_name,
    gr.gift_variant_id,
    gr.gift_sku,
    gr.gift_name,
    gr.gift_variant_name,
    gr.gift_quantity,
    gr.gift_img,
    gr.limit_quantity,
    gr.multiply_by_matched_quantity,
    gr.priority,
    gr.is_active,
    gr.starts_at,
    gr.ends_at,
    gr.created_at,
    gr.updated_at
  FROM gift_rules gr
  LEFT JOIN products condition_product ON condition_product.id = gr.product_id
  LEFT JOIN product_variants condition_variant ON condition_variant.id = gr.variant_id
  LEFT JOIN products gift_product ON gift_product.id = gr.gift_product_id
`;

async function getGiftRuleByIdRaw(giftRuleId: bigint, client: GiftRuleQueryClient = prisma2): Promise<GiftRuleRow | null> {
  const giftRules = await client.$queryRaw<GiftRuleRow[]>(Prisma.sql`
    ${giftRuleSelectSql}
    WHERE gr.id = ${giftRuleId}
    LIMIT 1
  `);

  return giftRules[0] ?? null;
}

async function getGiftRuleByNameRaw(name: string, client: GiftRuleQueryClient = prisma2): Promise<GiftRuleRow | null> {
  const giftRules = await client.$queryRaw<GiftRuleRow[]>(Prisma.sql`
    ${giftRuleSelectSql}
    WHERE gr.name = ${name}
    LIMIT 1
  `);

  return giftRules[0] ?? null;
}

async function ensureUniqueGiftRuleName(name: string, excludeId?: bigint): Promise<void> {
  const rows = await prisma2.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id
    FROM gift_rules
    WHERE name = ${name}
      ${excludeId === undefined ? Prisma.empty : Prisma.sql`AND id <> ${excludeId}`}
    LIMIT 1
  `);

  if (rows.length > 0) {
    throw new Error("T\u00ean ch\u01b0\u01a1ng tr\u00ecnh qu\u00e0 t\u1eb7ng \u0111\u00e3 t\u1ed3n t\u1ea1i");
  }
}

async function ensureUniqueBannerSlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.banners.findFirst({
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

async function ensureUniqueDiscountCode(code: string, excludeId?: bigint): Promise<void> {
  const where = excludeId === undefined ? { code } : { code, NOT: { id: excludeId } };
  const existingId = (
    await prisma2.discount_codes.findFirst({
      where,
      select: { id: true },
    })
  )?.id;

  if (existingId !== undefined) {
    throw new Error("Mã giảm giá đã tồn tại");
  }
}

async function ensureUniquePaymentMethodCode(code: string, excludeId?: bigint): Promise<void> {
  const where = excludeId === undefined ? { code } : { code, NOT: { id: excludeId } };
  const existingId = (
    await prisma2.payment_methods.findFirst({
      where,
      select: { id: true },
    })
  )?.id;

  if (existingId !== undefined) {
    throw new Error("Mã phương thức thanh toán đã tồn tại");
  }
}

export { parseSrxBannerInput, parseSrxDiscountCodeInput, parseSrxGiftRuleInput, parseSrxPaymentMethodInput };

export async function getSrxGiftRules(): Promise<SrxGiftRule[]> {
  try {
    const giftRules = await prisma2.$queryRaw<GiftRuleRow[]>(Prisma.sql`
      ${giftRuleSelectSql}
      ORDER BY gr.is_active DESC, gr.priority DESC, gr.created_at DESC
    `);

    return giftRules.map((giftRule) =>
      mapGiftRule({
        ...giftRule,
        rule_type: giftRule.rule_type as (typeof srxGiftRuleTypeValues)[number],
      }),
    );
  } catch (error) {
    if (isMissingWebsiteTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function createSrxGiftRule(input: SrxGiftRuleMutationInput): Promise<SrxGiftRule> {
  try {
    const payload = parseSrxGiftRuleInput(input);
    const { endsAt, giftProductId, giftVariantId, limitQuantity, minSubtotal, productId, startsAt, variantId } =
      validateGiftRulePayload(payload);
    const giftImg = resolveNullableSiteAssetUrlForStorage(payload.gift_img);

    await ensureUniqueGiftRuleName(payload.name);

    const giftRule = await prisma2.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO gift_rules (
          name,
          description,
          rule_type,
          product_id,
          variant_id,
          min_quantity,
          min_subtotal,
          gift_product_id,
          gift_variant_id,
          gift_sku,
          gift_name,
          gift_variant_name,
          gift_quantity,
          gift_img,
          limit_quantity,
          multiply_by_matched_quantity,
          priority,
          starts_at,
          ends_at,
          is_active
        )
        VALUES (
          ${payload.name},
          ${normalizeNullableString(payload.description)},
          ${payload.rule_type},
          ${productId},
          ${variantId},
          ${payload.min_quantity},
          ${minSubtotal},
          ${giftProductId},
          ${giftVariantId},
          ${normalizeNullableString(payload.gift_sku)},
          ${payload.gift_name},
          ${normalizeNullableString(payload.gift_variant_name)},
          ${payload.gift_quantity},
          ${giftImg},
          ${limitQuantity},
          ${payload.multiply_by_matched_quantity},
          ${payload.priority},
          ${startsAt},
          ${endsAt},
          ${payload.is_active}
        )
      `);

      return getGiftRuleByNameRaw(payload.name, tx);
    });

    if (!giftRule) {
      throw new Error("Kh\u00f4ng th\u1ec3 t\u1ea1o ch\u01b0\u01a1ng tr\u00ecnh qu\u00e0 t\u1eb7ng");
    }

    return mapGiftRule(giftRule);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function updateSrxGiftRule(
  giftRuleId: string,
  input: SrxGiftRuleMutationInput,
): Promise<SrxGiftRule | null> {
  try {
    const payload = parseSrxGiftRuleInput(input);
    const numericId = BigInt(giftRuleId);
    const existing = await getGiftRuleByIdRaw(numericId);

    if (!existing) {
      return null;
    }

    const { endsAt, giftProductId, giftVariantId, limitQuantity, minSubtotal, productId, startsAt, variantId } =
      validateGiftRulePayload(payload);
    const giftImg = resolveNullableSiteAssetUrlForStorage(payload.gift_img);

    await ensureUniqueGiftRuleName(payload.name, numericId);

    await prisma2.$executeRaw(Prisma.sql`
      UPDATE gift_rules
      SET
        name = ${payload.name},
        description = ${normalizeNullableString(payload.description)},
        rule_type = ${payload.rule_type},
        product_id = ${productId},
        variant_id = ${variantId},
        min_quantity = ${payload.min_quantity},
        min_subtotal = ${minSubtotal},
        gift_product_id = ${giftProductId},
        gift_variant_id = ${giftVariantId},
        gift_sku = ${normalizeNullableString(payload.gift_sku)},
        gift_name = ${payload.gift_name},
        gift_variant_name = ${normalizeNullableString(payload.gift_variant_name)},
        gift_quantity = ${payload.gift_quantity},
        gift_img = ${giftImg},
        limit_quantity = ${limitQuantity},
        multiply_by_matched_quantity = ${payload.multiply_by_matched_quantity},
        priority = ${payload.priority},
        starts_at = ${startsAt},
        ends_at = ${endsAt},
        is_active = ${payload.is_active},
        updated_at = NOW()
      WHERE id = ${numericId}
    `);

    const giftRule = await getGiftRuleByIdRaw(numericId);

    if (!giftRule) {
      return null;
    }

    return mapGiftRule(giftRule);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function deleteSrxGiftRule(giftRuleId: string): Promise<void> {
  try {
    await prisma2.$executeRaw(Prisma.sql`
      DELETE FROM gift_rules
      WHERE id = ${BigInt(giftRuleId)}
    `);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function getSrxDiscountCodes(): Promise<SrxDiscountCode[]> {
  try {
    const discountCodes = await prisma2.discount_codes.findMany({
      orderBy: [{ is_active: "desc" }, { created_at: "desc" }],
      include: {
        users: {
          select: {
            full_name: true,
          },
        },
        discount_code_product_links: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        discount_code_category_links: {
          include: {
            product_categories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        discount_code_redemptions: {
          where: {
            status: "applied",
          },
          select: {
            id: true,
          },
        },
      },
    });

    return discountCodes.map((discountCode) =>
      mapDiscountCode({
        ...discountCode,
        discount_type: discountCode.discount_type as (typeof srxDiscountCodeTypeValues)[number],
        scope_type: discountCode.scope_type as (typeof srxDiscountCodeScopeValues)[number],
      }),
    );
  } catch (error) {
    if (isMissingWebsiteTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getSrxBanners(): Promise<SrxBanner[]> {
  try {
    const banners = await prisma2.$queryRaw<BannerRow[]>(Prisma.sql`
      SELECT
        id,
        title,
        slug,
        description,
        image_url,
        mobile_image_url,
        alt_text,
        button_label,
        link_type,
        link_target,
        position,
        open_in_new_tab,
        sort_order,
        starts_at,
        ends_at,
        is_active,
        created_at,
        updated_at
      FROM banners
      ORDER BY sort_order ASC, created_at DESC
    `);

    return banners.map((banner) => mapBanner(banner));
  } catch (error) {
    if (isMissingWebsiteTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getSrxPaymentMethods(): Promise<SrxPaymentMethod[]> {
  try {
    const paymentMethods = await prisma2.payment_methods.findMany({
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });

    return paymentMethods.map((paymentMethod) =>
      mapPaymentMethod({
        ...paymentMethod,
        method_type: paymentMethod.method_type as (typeof srxPaymentMethodTypeValues)[number],
        fee_type: paymentMethod.fee_type as (typeof srxPaymentMethodFeeTypeValues)[number],
      }),
    );
  } catch (error) {
    if (isMissingWebsiteTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function createSrxDiscountCode(input: SrxDiscountCodeMutationInput): Promise<SrxDiscountCode> {
  try {
    const payload = parseSrxDiscountCodeInput(input);
    const normalizedCode = normalizeDiscountCode(payload.code);
    const {
      categoryIds,
      discountValue,
      endsAt,
      maxDiscountAmount,
      minOrderAmount,
      perUserLimit,
      productIds,
      startsAt,
      totalUsageLimit,
    } = validateDiscountCodePayload(payload);

    await ensureUniqueDiscountCode(normalizedCode);

    const discountCode = await prisma2.$transaction(async (tx) => {
      const createdDiscountCode = await tx.discount_codes.create({
        data: {
          code: normalizedCode,
          name: payload.name,
          description: normalizeNullableString(payload.description),
          discount_type: payload.discount_type,
          discount_value: discountValue,
          max_discount_amount: maxDiscountAmount,
          min_order_amount: minOrderAmount,
          total_usage_limit: totalUsageLimit,
          per_user_limit: perUserLimit,
          scope_type: payload.scope_type,
          starts_at: startsAt,
          ends_at: endsAt,
          is_active: payload.is_active,
        },
      });

      if (productIds.length > 0) {
        await tx.discount_code_product_links.createMany({
          data: productIds.map((productId) => ({
            discount_code_id: createdDiscountCode.id,
            product_id: productId,
          })),
        });
      }

      if (categoryIds.length > 0) {
        await tx.discount_code_category_links.createMany({
          data: categoryIds.map((categoryId) => ({
            discount_code_id: createdDiscountCode.id,
            category_id: categoryId,
          })),
        });
      }

      return tx.discount_codes.findUniqueOrThrow({
        where: {
          id: createdDiscountCode.id,
        },
        include: {
          users: {
            select: {
              full_name: true,
            },
          },
          discount_code_product_links: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          discount_code_category_links: {
            include: {
              product_categories: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          discount_code_redemptions: {
            where: {
              status: "applied",
            },
            select: {
              id: true,
            },
          },
        },
      });
    });

    return mapDiscountCode({
      ...discountCode,
      discount_type: discountCode.discount_type as (typeof srxDiscountCodeTypeValues)[number],
      scope_type: discountCode.scope_type as (typeof srxDiscountCodeScopeValues)[number],
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function updateSrxDiscountCode(
  discountCodeId: string,
  input: SrxDiscountCodeMutationInput,
): Promise<SrxDiscountCode | null> {
  try {
    const payload = parseSrxDiscountCodeInput(input);
    const numericId = BigInt(discountCodeId);
    const normalizedCode = normalizeDiscountCode(payload.code);
    const {
      categoryIds,
      discountValue,
      endsAt,
      maxDiscountAmount,
      minOrderAmount,
      perUserLimit,
      productIds,
      startsAt,
      totalUsageLimit,
    } = validateDiscountCodePayload(payload);

    const existing = await prisma2.discount_codes.findUnique({
      where: { id: numericId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    await ensureUniqueDiscountCode(normalizedCode, numericId);

    await prisma2.$transaction(async (tx) => {
      await tx.discount_code_product_links.deleteMany({
        where: {
          discount_code_id: numericId,
        },
      });

      await tx.discount_code_category_links.deleteMany({
        where: {
          discount_code_id: numericId,
        },
      });

      await tx.discount_codes.update({
        where: {
          id: numericId,
        },
        data: {
          code: normalizedCode,
          name: payload.name,
          description: normalizeNullableString(payload.description),
          discount_type: payload.discount_type,
          discount_value: discountValue,
          max_discount_amount: maxDiscountAmount,
          min_order_amount: minOrderAmount,
          total_usage_limit: totalUsageLimit,
          per_user_limit: perUserLimit,
          scope_type: payload.scope_type,
          starts_at: startsAt,
          ends_at: endsAt,
          is_active: payload.is_active,
        },
      });

      if (productIds.length > 0) {
        await tx.discount_code_product_links.createMany({
          data: productIds.map((productId) => ({
            discount_code_id: numericId,
            product_id: productId,
          })),
        });
      }

      if (categoryIds.length > 0) {
        await tx.discount_code_category_links.createMany({
          data: categoryIds.map((categoryId) => ({
            discount_code_id: numericId,
            category_id: categoryId,
          })),
        });
      }
    });

    const discountCode = await prisma2.discount_codes.findUnique({
      where: {
        id: numericId,
      },
      include: {
        users: {
          select: {
            full_name: true,
          },
        },
        discount_code_product_links: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        discount_code_category_links: {
          include: {
            product_categories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        discount_code_redemptions: {
          where: {
            status: "applied",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!discountCode) {
      return null;
    }

    return mapDiscountCode({
      ...discountCode,
      discount_type: discountCode.discount_type as (typeof srxDiscountCodeTypeValues)[number],
      scope_type: discountCode.scope_type as (typeof srxDiscountCodeScopeValues)[number],
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function deleteSrxDiscountCode(discountCodeId: string): Promise<void> {
  try {
    const numericId = BigInt(discountCodeId);
    const discountCode = await prisma2.discount_codes.findUnique({
      where: { id: numericId },
      include: {
        _count: {
          select: {
            discount_code_redemptions: true,
          },
        },
      },
    });

    if (!discountCode) {
      throw new Error("Không tìm thấy mã giảm giá");
    }

    if (discountCode._count.discount_code_redemptions > 0) {
      throw new Error("Mã giảm giá đã được sử dụng, không thể xóa");
    }

    await prisma2.discount_codes.delete({
      where: {
        id: numericId,
      },
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function createSrxBanner(input: SrxBannerMutationInput): Promise<SrxBanner> {
  try {
    const payload = parseSrxBannerInput(input);
    const startsAt = parseOptionalDate(payload.starts_at);
    const endsAt = parseOptionalDate(payload.ends_at);
    const imageUrl = resolveSiteAssetUrlForStorage(payload.image_url);
    const mobileImageUrl = resolveNullableSiteAssetUrlForStorage(payload.mobile_image_url);

    validateDateRange(startsAt, endsAt);

    const slug = await ensureUniqueBannerSlug(slugify(payload.slug || payload.title));
    const banner = await prisma2.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO banners (
          title,
          slug,
          description,
          image_url,
          mobile_image_url,
          alt_text,
          button_label,
          link_type,
          link_target,
          position,
          open_in_new_tab,
          sort_order,
          starts_at,
          ends_at,
          is_active
        )
        VALUES (
          ${payload.title},
          ${slug},
          ${normalizeNullableString(payload.description)},
          ${imageUrl},
          ${mobileImageUrl},
          ${normalizeNullableString(payload.alt_text)},
          ${normalizeNullableString(payload.button_label)},
          ${payload.link_type},
          ${normalizeNullableString(payload.link_target)},
          ${payload.position},
          ${payload.open_in_new_tab},
          ${payload.sort_order},
          ${startsAt},
          ${endsAt},
          ${payload.is_active}
        )
      `);

      return getBannerBySlugRaw(slug, tx);
    });

    if (!banner) {
      throw new Error("Khong the tao banner");
    }

    return mapBanner(banner);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function updateSrxBanner(bannerId: string, input: SrxBannerMutationInput): Promise<SrxBanner | null> {
  try {
    const payload = parseSrxBannerInput(input);
    const numericId = BigInt(bannerId);
    const startsAt = parseOptionalDate(payload.starts_at);
    const endsAt = parseOptionalDate(payload.ends_at);
    const imageUrl = resolveSiteAssetUrlForStorage(payload.image_url);
    const mobileImageUrl = resolveNullableSiteAssetUrlForStorage(payload.mobile_image_url);

    validateDateRange(startsAt, endsAt);

    const existing = await getBannerByIdRaw(numericId);

    if (!existing) {
      return null;
    }

    const slug = await ensureUniqueBannerSlug(slugify(payload.slug || payload.title), numericId);
    await prisma2.$executeRaw(Prisma.sql`
      UPDATE banners
      SET
        title = ${payload.title},
        slug = ${slug},
        description = ${normalizeNullableString(payload.description)},
        image_url = ${imageUrl},
        mobile_image_url = ${mobileImageUrl},
        alt_text = ${normalizeNullableString(payload.alt_text)},
        button_label = ${normalizeNullableString(payload.button_label)},
        link_type = ${payload.link_type},
        link_target = ${normalizeNullableString(payload.link_target)},
        position = ${payload.position},
        open_in_new_tab = ${payload.open_in_new_tab},
        sort_order = ${payload.sort_order},
        starts_at = ${startsAt},
        ends_at = ${endsAt},
        is_active = ${payload.is_active},
        updated_at = NOW()
      WHERE id = ${numericId}
    `);

    const banner = await getBannerByIdRaw(numericId);

    if (!banner) {
      return null;
    }

    return mapBanner(banner);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function deleteSrxBanner(bannerId: string): Promise<void> {
  try {
    await prisma2.$executeRaw(Prisma.sql`
      DELETE FROM banners
      WHERE id = ${BigInt(bannerId)}
    `);
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function createSrxPaymentMethod(input: SrxPaymentMethodMutationInput): Promise<SrxPaymentMethod> {
  try {
    const payload = parseSrxPaymentMethodInput(input);
    const normalizedCode = normalizeCodeToken(payload.code);
    const { feeValue, maxOrderAmount, minOrderAmount, parsedConfigJson } = validatePaymentMethodPayload(payload);
    const iconUrl = resolveNullableSiteAssetUrlForStorage(payload.icon_url);

    await ensureUniquePaymentMethodCode(normalizedCode);

    const paymentMethod = await prisma2.payment_methods.create({
      data: {
        code: normalizedCode,
        name: payload.name,
        description: normalizeNullableString(payload.description),
        provider: normalizeNullableString(payload.provider),
        method_type: payload.method_type,
        instructions: normalizeNullableString(payload.instructions),
        icon_url: iconUrl,
        fee_type: payload.fee_type,
        fee_value: feeValue,
        min_order_amount: minOrderAmount,
        max_order_amount: maxOrderAmount,
        sort_order: payload.sort_order,
        is_active: payload.is_active,
        config_json: parsedConfigJson,
      },
    });

    return mapPaymentMethod({
      ...paymentMethod,
      method_type: paymentMethod.method_type as (typeof srxPaymentMethodTypeValues)[number],
      fee_type: paymentMethod.fee_type as (typeof srxPaymentMethodFeeTypeValues)[number],
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function updateSrxPaymentMethod(
  paymentMethodId: string,
  input: SrxPaymentMethodMutationInput,
): Promise<SrxPaymentMethod | null> {
  try {
    const payload = parseSrxPaymentMethodInput(input);
    const numericId = BigInt(paymentMethodId);
    const normalizedCode = normalizeCodeToken(payload.code);
    const { feeValue, maxOrderAmount, minOrderAmount, parsedConfigJson } = validatePaymentMethodPayload(payload);
    const iconUrl = resolveNullableSiteAssetUrlForStorage(payload.icon_url);

    const existing = await prisma2.payment_methods.findUnique({
      where: { id: numericId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    await ensureUniquePaymentMethodCode(normalizedCode, numericId);

    const paymentMethod = await prisma2.payment_methods.update({
      where: {
        id: numericId,
      },
      data: {
        code: normalizedCode,
        name: payload.name,
        description: normalizeNullableString(payload.description),
        provider: normalizeNullableString(payload.provider),
        method_type: payload.method_type,
        instructions: normalizeNullableString(payload.instructions),
        icon_url: iconUrl,
        fee_type: payload.fee_type,
        fee_value: feeValue,
        min_order_amount: minOrderAmount,
        max_order_amount: maxOrderAmount,
        sort_order: payload.sort_order,
        is_active: payload.is_active,
        config_json: parsedConfigJson,
      },
    });

    return mapPaymentMethod({
      ...paymentMethod,
      method_type: paymentMethod.method_type as (typeof srxPaymentMethodTypeValues)[number],
      fee_type: paymentMethod.fee_type as (typeof srxPaymentMethodFeeTypeValues)[number],
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function deleteSrxPaymentMethod(paymentMethodId: string): Promise<void> {
  try {
    await prisma2.payment_methods.delete({
      where: {
        id: BigInt(paymentMethodId),
      },
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}
