import { z } from "zod";

/** Mẫu ZBS "SRX | Tri ân khách hàng" (Mẫu Voucher) của OA SRX Việt Nam. */
export const SRX_LUCKY_WHEEL_ZBS_DEFAULT_TEMPLATE_ID = "618787";
export const SRX_LUCKY_WHEEL_ZBS_DEFAULT_TOKEN_NAME = "zalo_srx";

/** Cấu hình chung, lưu ở website_settings (khóa lucky_wheel); SRX_web đọc cùng khóa này. */
export const srxLuckyWheelSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().trim().min(1).max(80).default("Vòng quay may mắn"),
  description: z.string().trim().max(300).default(""),
  referral_enabled: z.boolean().default(true),
  /** Số lượt cộng cho người giới thiệu với mỗi người bạn đủ điều kiện. */
  referral_spins: z.coerce.number().int().min(1).max(10).default(1),
  /** Tổng lượt tối đa một người nhận được từ giới thiệu. 0 = không giới hạn. */
  referral_max_spins: z.coerce.number().int().min(0).max(1000).default(0),
  /** Bạn được giới thiệu phải từng đăng nhập bằng Zalo (có users.zalo_id) thì mới tính: chống tạo tài khoản ảo. */
  referral_requires_activation: z.boolean().default(false),
  terms: z.string().trim().max(3000).default(""),
  /** Gửi mã voucher trúng thưởng tới Zalo của khách bằng tin ZBS. */
  zbs_enabled: z.boolean().default(true),
  zbs_template_id: z
    .string()
    .trim()
    .regex(/^\d{1,20}$/, "ID mẫu ZBS chỉ gồm chữ số")
    .default(SRX_LUCKY_WHEEL_ZBS_DEFAULT_TEMPLATE_ID),
  /** Dòng access_token của OA gửi tin trong bảng token (cột token_name). */
  zbs_token_name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]{1,64}$/, "Tên token chỉ gồm chữ, số, dấu gạch")
    .default(SRX_LUCKY_WHEEL_ZBS_DEFAULT_TOKEN_NAME),
});

export const srxLuckyWheelSettingsStateSchema = srxLuckyWheelSettingsSchema.extend({
  updated_at: z.coerce.date().nullable(),
});

export const srxLuckyWheelPrizeTypeValues = ["voucher", "gift", "no_prize"] as const;
export const srxLuckyWheelPrizeTypeSchema = z.enum(srxLuckyWheelPrizeTypeValues);

export const srxLuckyWheelPrizeTypeLabels: Record<SrxLuckyWheelPrizeType, string> = {
  voucher: "Mã giảm giá",
  gift: "Quà tặng",
  no_prize: "Chúc may mắn lần sau",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === "" ? null : (value ?? null)));

export const srxLuckyWheelDiscountTypeValues = ["percentage", "fixed_amount"] as const;

export const srxLuckyWheelDiscountTypeLabels: Record<(typeof srxLuckyWheelDiscountTypeValues)[number], string> = {
  percentage: "Giảm theo %",
  fixed_amount: "Giảm số tiền",
};

const optionalAmount = z.coerce.number().min(0).max(1_000_000_000).nullable().default(null);

/** Mỗi lần trúng sinh một mã giảm giá 8 chữ số dùng 1 lần theo cấu hình này (hiệu lực 3 tháng). */
export const srxLuckyWheelVoucherConfigSchema = z.object({
  discount_type: z.enum(srxLuckyWheelDiscountTypeValues),
  discount_value: z.coerce.number().positive("Nhập giá trị giảm").max(1_000_000_000),
  /** Chỉ dùng với giảm theo %. */
  max_discount_amount: optionalAmount,
  min_order_amount: optionalAmount,
});

const srxLuckyWheelPrizeBaseSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên phần thưởng").max(150),
  description: optionalText(500),
  image_url: z.string().trim().min(1, "Chọn ảnh phần thưởng").max(500),
  prize_type: srxLuckyWheelPrizeTypeSchema.default("gift"),
  reward_code: optionalText(100),
  claim_instructions: optionalText(500),
  weight: z.coerce.number().int().min(0).max(1_000_000).default(0),
  /** null = không giới hạn số lượng. */
  stock_total: z.coerce.number().int().min(0).max(1_000_000).nullable().default(null),
  sort_order: z.coerce.number().int().min(-10_000).max(10_000).default(0),
  is_active: z.boolean().default(true),
  voucher_config: srxLuckyWheelVoucherConfigSchema.nullable().default(null),
});

export const srxLuckyWheelPrizeInputSchema = srxLuckyWheelPrizeBaseSchema.superRefine((prize, context) => {
  if (prize.prize_type !== "voucher") {
    return;
  }

  if (!prize.voucher_config) {
    context.addIssue({ code: "custom", path: ["voucher_config"], message: "Nhập mức giảm của voucher" });
    return;
  }

  if (prize.voucher_config.discount_type === "percentage" && prize.voucher_config.discount_value > 100) {
    context.addIssue({ code: "custom", path: ["voucher_config", "discount_value"], message: "Giảm tối đa 100%" });
  }
});

export const srxLuckyWheelPrizeSchema = srxLuckyWheelPrizeBaseSchema.extend({
  id: z.coerce.string(),
  stock_used: z.coerce.number().int(),
  win_count: z.coerce.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxLuckyWheelSpinStatusSchema = z.enum(["won", "fulfilled"]);

export const srxLuckyWheelZbsStatusValues = ["none", "pending", "sending", "sent", "failed"] as const;
export const srxLuckyWheelZbsStatusSchema = z.enum(srxLuckyWheelZbsStatusValues);

export const srxLuckyWheelSpinSchema = z.object({
  id: z.coerce.string(),
  user_id: z.coerce.string(),
  customer_name: z.string(),
  customer_phone: z.string().nullable(),
  customer_email: z.string().nullable(),
  prize_name: z.string(),
  prize_type: srxLuckyWheelPrizeTypeSchema,
  reward_code: z.string().nullable(),
  status: srxLuckyWheelSpinStatusSchema,
  fulfilled_at: z.coerce.date().nullable(),
  /** Ngày hết hạn của mã voucher tự sinh (dd/mm/yyyy), null nếu không phải voucher tự sinh. */
  voucher_ends_on: z.string().nullable(),
  zbs_status: srxLuckyWheelZbsStatusSchema,
  zbs_error: z.string().nullable(),
  zbs_sent_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

export const srxLuckyWheelStatsSchema = z.object({
  total_spins: z.coerce.number().int(),
  winning_spins: z.coerce.number().int(),
  pending_fulfillment: z.coerce.number().int(),
  signed_in_players: z.coerce.number().int(),
  referrals_signed_up: z.coerce.number().int(),
  referrals_credited: z.coerce.number().int(),
});

export type SrxLuckyWheelSettings = z.infer<typeof srxLuckyWheelSettingsSchema>;
export type SrxLuckyWheelSettingsState = z.infer<typeof srxLuckyWheelSettingsStateSchema>;
export type SrxLuckyWheelPrizeType = z.infer<typeof srxLuckyWheelPrizeTypeSchema>;
export type SrxLuckyWheelVoucherConfig = z.infer<typeof srxLuckyWheelVoucherConfigSchema>;
export type SrxLuckyWheelZbsStatus = z.infer<typeof srxLuckyWheelZbsStatusSchema>;
export type SrxLuckyWheelPrizeInput = z.infer<typeof srxLuckyWheelPrizeInputSchema>;
export type SrxLuckyWheelPrize = z.infer<typeof srxLuckyWheelPrizeSchema>;
export type SrxLuckyWheelSpinStatus = z.infer<typeof srxLuckyWheelSpinStatusSchema>;
export type SrxLuckyWheelSpin = z.infer<typeof srxLuckyWheelSpinSchema>;
export type SrxLuckyWheelStats = z.infer<typeof srxLuckyWheelStatsSchema>;

export const defaultSrxLuckyWheelSettings: SrxLuckyWheelSettings = srxLuckyWheelSettingsSchema.parse({});

export function parseSrxLuckyWheelSettings(input: unknown): SrxLuckyWheelSettings {
  return srxLuckyWheelSettingsSchema.parse(input);
}

export function parseSrxLuckyWheelSettingsState(input: unknown): SrxLuckyWheelSettingsState {
  return srxLuckyWheelSettingsStateSchema.parse(input);
}

export function parseSrxLuckyWheelPrizeInput(input: unknown): SrxLuckyWheelPrizeInput {
  return srxLuckyWheelPrizeInputSchema.parse(input);
}

export function parseSrxLuckyWheelPrize(input: unknown): SrxLuckyWheelPrize {
  return srxLuckyWheelPrizeSchema.parse(input);
}

export function parseSrxLuckyWheelSpin(input: unknown): SrxLuckyWheelSpin {
  return srxLuckyWheelSpinSchema.parse(input);
}

/** Phần thưởng có thể trúng ở lần quay tiếp theo: đang bật, trọng số > 0 và còn hàng. */
export function isPrizeDrawable(
  prize: Pick<SrxLuckyWheelPrize, "is_active" | "weight" | "stock_total" | "stock_used">,
) {
  return prize.is_active && prize.weight > 0 && (prize.stock_total === null || prize.stock_used < prize.stock_total);
}

/** Tỷ lệ trúng thực tế (%) của từng phần thưởng ở lần quay tiếp theo. */
export function computeWinRates(prizes: SrxLuckyWheelPrize[]): Map<string, number> {
  const drawable = prizes.filter(isPrizeDrawable);
  const totalWeight = drawable.reduce((sum, prize) => sum + prize.weight, 0);

  return new Map(
    prizes.map((prize) => [
      prize.id,
      totalWeight > 0 && isPrizeDrawable(prize) ? (prize.weight / totalWeight) * 100 : 0,
    ]),
  );
}

// ---------- Tin ZBS gửi mã voucher ----------

/** Độ dài tối đa từng tham số theo mẫu 618787 đã duyệt trên Zalo. */
export const srxLuckyWheelZbsParamLimits = {
  customer_name: 30,
  customer_id: 30,
  voucher_code: 30,
  voucher: 200,
  voucher_name: 30,
  dieukien: 30,
  start_date: 20,
  expire: 20,
} as const;

export type SrxLuckyWheelZbsTemplateData = Record<keyof typeof srxLuckyWheelZbsParamLimits, string>;

function truncateParam(value: string, maxLength: number): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();
  return normalizedValue.length > maxLength ? normalizedValue.slice(0, maxLength).trimEnd() : normalizedValue;
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

/** Mã thành viên hiện trong tin: KH + id tài khoản, đủ 6 chữ số (KH000123). */
export function buildCustomerCode(userId: string | number): string {
  return `KH${String(userId).padStart(6, "0")}`;
}

/**
 * Tham số cho mẫu "SRX | Tri ân khách hàng":
 *   voucher       → "100.000đ" / "10%"            (giá trị giảm)
 *   voucher_name  → "Giảm 100.000đ" / "Giảm 10%"   (tiêu đề thẻ voucher)
 *   dieukien      → "đơn hàng từ 300.000đ" / "mọi đơn hàng"
 *   start_date / expire: "HH:mm:ss dd/MM/yyyy" (tham số kiểu date của Zalo).
 */
export function buildSrxLuckyWheelZbsTemplateData(input: {
  customerName: string;
  customerCode: string;
  voucherCode: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startDate: string;
  expire: string;
}): SrxLuckyWheelZbsTemplateData {
  const limits = srxLuckyWheelZbsParamLimits;
  const amount = input.discountType === "percentage" ? `${input.discountValue}%` : formatVnd(input.discountValue);
  const cap =
    input.discountType === "percentage" && input.maxDiscountAmount
      ? ` tối đa ${formatVnd(input.maxDiscountAmount)}`
      : "";
  // "Giảm 10% tối đa 50.000đ" vượt 30 ký tự thì bỏ phần "tối đa".
  const voucherName = `Giảm ${amount}${cap}`.length <= limits.voucher_name ? `Giảm ${amount}${cap}` : `Giảm ${amount}`;

  return {
    customer_name: truncateParam(input.customerName || "Quý khách", limits.customer_name),
    customer_id: truncateParam(input.customerCode, limits.customer_id),
    voucher_code: truncateParam(input.voucherCode, limits.voucher_code),
    voucher: truncateParam(amount, limits.voucher),
    voucher_name: voucherName,
    dieukien: truncateParam(
      input.minOrderAmount ? `đơn hàng từ ${formatVnd(input.minOrderAmount)}` : "mọi đơn hàng",
      limits.dieukien,
    ),
    start_date: truncateParam(input.startDate, limits.start_date),
    expire: truncateParam(input.expire, limits.expire),
  };
}
