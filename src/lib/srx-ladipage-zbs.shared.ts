import { z } from "zod";

/** Mẫu ZBS "Đăng ký sự kiện" của OA EAC Group. */
export const SRX_LADIPAGE_ZBS_DEFAULT_TEMPLATE_ID = "641012";
export const SRX_LADIPAGE_ZBS_STATUS_TEXT = "Đã xác nhận";

/** Độ dài tối đa từng tham số theo mẫu đã duyệt trên Zalo. */
export const srxLadipageZbsParamLimits = {
  customer_name: 30,
  status: 30,
  event_name: 200,
  event_format: 30,
  event_location: 200,
  event_time: 20,
  code: 30,
} as const;

export const srxLadipageZbsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  template_id: z
    .string()
    .trim()
    .regex(/^\d{1,20}$/, "ID mẫu ZBS chỉ gồm chữ số")
    .default(SRX_LADIPAGE_ZBS_DEFAULT_TEMPLATE_ID),
  event_name: z.string().trim().max(srxLadipageZbsParamLimits.event_name).default(""),
  event_location: z.string().trim().max(srxLadipageZbsParamLimits.event_location).default(""),
  event_format: z.string().trim().max(srxLadipageZbsParamLimits.event_format).default(""),
});

export const srxLadipageZbsLogStatusValues = ["pending", "sent", "failed"] as const;

export const srxLadipageZbsLogSchema = z.object({
  id: z.string(),
  registration_id: z.string().nullable(),
  is_test: z.boolean(),
  code: z.string(),
  phone: z.string(),
  customer_name: z.string(),
  status: z.enum(srxLadipageZbsLogStatusValues),
  msg_id: z.string(),
  error_message: z.string(),
  created_at: z.coerce.date(),
  sent_at: z.coerce.date().nullable(),
});

export const srxLadipageZbsTestInputSchema = z.object({
  phone: z.string().trim().min(9, "Nhập số điện thoại nhận tin thử"),
  customer_name: z.string().trim().min(1, "Nhập tên khách hàng").max(srxLadipageZbsParamLimits.customer_name),
});

export type SrxLadipageZbsSettings = z.infer<typeof srxLadipageZbsSettingsSchema>;
export type SrxLadipageZbsLog = z.infer<typeof srxLadipageZbsLogSchema>;
export type SrxLadipageZbsTemplateData = Record<keyof typeof srxLadipageZbsParamLimits, string>;

export function parseSrxLadipageZbsSettings(input: unknown): SrxLadipageZbsSettings {
  return srxLadipageZbsSettingsSchema.parse(input);
}

export function parseSrxLadipageZbsLog(input: unknown): SrxLadipageZbsLog {
  return srxLadipageZbsLogSchema.parse(input);
}

function truncate(value: string, maxLength: number): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();
  return normalizedValue.length > maxLength ? normalizedValue.slice(0, maxLength).trimEnd() : normalizedValue;
}

/**
 * "0912 345 678", "+84912345678", "84912345678" → "84912345678" (định dạng Zalo yêu cầu).
 * Trả về chuỗi rỗng khi không phải số di động Việt Nam hợp lệ.
 */
export function normalizeZbsPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = `84${digits.slice(1)}`;
  }

  return /^84[35789]\d{8}$/.test(digits) ? digits : "";
}

/** Ghép tham số gửi Zalo; cắt bớt theo giới hạn của mẫu để Zalo không từ chối. */
export function buildSrxLadipageZbsTemplateData(input: {
  code: string;
  customerName: string;
  eventFormat: string;
  eventLocation: string;
  eventName: string;
  eventTime: string;
}): SrxLadipageZbsTemplateData {
  const limits = srxLadipageZbsParamLimits;

  return {
    customer_name: truncate(input.customerName, limits.customer_name),
    status: SRX_LADIPAGE_ZBS_STATUS_TEXT,
    event_name: truncate(input.eventName, limits.event_name),
    event_format: truncate(input.eventFormat, limits.event_format),
    event_location: truncate(input.eventLocation, limits.event_location),
    event_time: truncate(input.eventTime, limits.event_time),
    code: truncate(input.code, limits.code),
  };
}
