/* eslint-disable max-lines, no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import "server-only";

import { prisma2 } from "@/lib/prisma2";
import {
  parseSrxBannerInput,
  parseSrxDiscountCodeInput,
  parseSrxPaymentMethodInput,
  srxBannerSchema,
  srxBannerPositionValues,
  srxBannerLinkTypeValues,
  srxDiscountCodeScopeValues,
  srxDiscountCodeSchema,
  srxDiscountCodeTypeValues,
  srxPaymentMethodFeeTypeValues,
  srxPaymentMethodTypeValues,
  srxPaymentMethodSchema,
  type SrxBanner,
  type SrxBannerMutationInput,
  type SrxDiscountCode,
  type SrxDiscountCodeMutationInput,
  type SrxPaymentMethod,
  type SrxPaymentMethodMutationInput,
} from "@/lib/srx-website.shared";

import { Prisma } from "../../prisma/generated/srx-client";

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
  link_type: (typeof srxBannerLinkTypeValues)[number];
  link_target: string | null;
  position: (typeof srxBannerPositionValues)[number];
  open_in_new_tab: boolean;
  sort_order: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): SrxBanner {
  return srxBannerSchema.parse({
    id: banner.id.toString(),
    title: banner.title,
    slug: banner.slug,
    description: normalizeOptionalString(banner.description),
    image_url: banner.image_url,
    mobile_image_url: normalizeOptionalString(banner.mobile_image_url),
    alt_text: normalizeOptionalString(banner.alt_text),
    button_label: normalizeOptionalString(banner.button_label),
    link_type: banner.link_type,
    link_target: normalizeOptionalString(banner.link_target),
    position: banner.position,
    open_in_new_tab: banner.open_in_new_tab,
    sort_order: banner.sort_order,
    starts_at: banner.starts_at,
    ends_at: banner.ends_at,
    is_active: banner.is_active,
    created_at: banner.created_at,
    updated_at: banner.updated_at,
  });
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
    icon_url: normalizeOptionalString(paymentMethod.icon_url),
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

export { parseSrxBannerInput, parseSrxDiscountCodeInput, parseSrxPaymentMethodInput };

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
    const banners = await prisma2.banners.findMany({
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });

    return banners.map((banner) =>
      mapBanner({
        ...banner,
        link_type: banner.link_type as (typeof srxBannerLinkTypeValues)[number],
        position: banner.position as (typeof srxBannerPositionValues)[number],
      }),
    );
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

    validateDateRange(startsAt, endsAt);

    const slug = await ensureUniqueBannerSlug(slugify(payload.slug || payload.title));
    const banner = await prisma2.banners.create({
      data: {
        title: payload.title,
        slug,
        description: normalizeNullableString(payload.description),
        image_url: payload.image_url,
        mobile_image_url: normalizeNullableString(payload.mobile_image_url),
        alt_text: normalizeNullableString(payload.alt_text),
        button_label: normalizeNullableString(payload.button_label),
        link_type: payload.link_type,
        link_target: normalizeNullableString(payload.link_target),
        position: payload.position,
        open_in_new_tab: payload.open_in_new_tab,
        sort_order: payload.sort_order,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: payload.is_active,
      },
    });

    return mapBanner({
      ...banner,
      link_type: banner.link_type as (typeof srxBannerLinkTypeValues)[number],
      position: banner.position as (typeof srxBannerPositionValues)[number],
    });
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

    validateDateRange(startsAt, endsAt);

    const existing = await prisma2.banners.findUnique({
      where: { id: numericId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const slug = await ensureUniqueBannerSlug(slugify(payload.slug || payload.title), numericId);
    const banner = await prisma2.banners.update({
      where: {
        id: numericId,
      },
      data: {
        title: payload.title,
        slug,
        description: normalizeNullableString(payload.description),
        image_url: payload.image_url,
        mobile_image_url: normalizeNullableString(payload.mobile_image_url),
        alt_text: normalizeNullableString(payload.alt_text),
        button_label: normalizeNullableString(payload.button_label),
        link_type: payload.link_type,
        link_target: normalizeNullableString(payload.link_target),
        position: payload.position,
        open_in_new_tab: payload.open_in_new_tab,
        sort_order: payload.sort_order,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: payload.is_active,
      },
    });

    return mapBanner({
      ...banner,
      link_type: banner.link_type as (typeof srxBannerLinkTypeValues)[number],
      position: banner.position as (typeof srxBannerPositionValues)[number],
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function deleteSrxBanner(bannerId: string): Promise<void> {
  try {
    await prisma2.banners.delete({
      where: {
        id: BigInt(bannerId),
      },
    });
  } catch (error) {
    wrapMissingTableError(error);
  }
}

export async function createSrxPaymentMethod(input: SrxPaymentMethodMutationInput): Promise<SrxPaymentMethod> {
  try {
    const payload = parseSrxPaymentMethodInput(input);
    const normalizedCode = normalizeCodeToken(payload.code);
    const { feeValue, maxOrderAmount, minOrderAmount, parsedConfigJson } = validatePaymentMethodPayload(payload);

    await ensureUniquePaymentMethodCode(normalizedCode);

    const paymentMethod = await prisma2.payment_methods.create({
      data: {
        code: normalizedCode,
        name: payload.name,
        description: normalizeNullableString(payload.description),
        provider: normalizeNullableString(payload.provider),
        method_type: payload.method_type,
        instructions: normalizeNullableString(payload.instructions),
        icon_url: normalizeNullableString(payload.icon_url),
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
        icon_url: normalizeNullableString(payload.icon_url),
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
