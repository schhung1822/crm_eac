import { z } from "zod";

/** Cách popup trang chủ bật lên: sau vài giây, khi cuộn tới một mức, hoặc khi chuột rời khỏi trang. */
export const srxWebsitePopupTriggerValues = ["delay", "scroll", "exit_intent"] as const;
export const srxWebsitePopupTriggerSchema = z.enum(srxWebsitePopupTriggerValues);

/** Tần suất hiện lại với cùng một người xem (lưu ở trình duyệt của họ). */
export const srxWebsitePopupFrequencyValues = ["every_visit", "once_per_session", "once_per_days"] as const;
export const srxWebsitePopupFrequencySchema = z.enum(srxWebsitePopupFrequencyValues);

export const srxWebsitePopupSettingsSchema = z.object({
  homepage_enabled: z.boolean().default(false),
  trigger: srxWebsitePopupTriggerSchema.default("delay"),
  delay_seconds: z.coerce.number().int().min(0).max(600).default(5),
  scroll_percent: z.coerce.number().int().min(1).max(100).default(40),
  frequency: srxWebsitePopupFrequencySchema.default("once_per_session"),
  frequency_days: z.coerce.number().int().min(1).max(365).default(1),
  /** 0 = không tự chuyển ảnh. */
  auto_slide_seconds: z.coerce.number().int().min(0).max(60).default(0),
});

export const srxWebsitePopupSettingsStateSchema = srxWebsitePopupSettingsSchema.extend({
  updated_at: z.coerce.date().nullable(),
});

export type SrxWebsitePopupTrigger = z.infer<typeof srxWebsitePopupTriggerSchema>;
export type SrxWebsitePopupFrequency = z.infer<typeof srxWebsitePopupFrequencySchema>;
export type SrxWebsitePopupSettings = z.infer<typeof srxWebsitePopupSettingsSchema>;
export type SrxWebsitePopupSettingsState = z.infer<typeof srxWebsitePopupSettingsStateSchema>;

export const defaultSrxWebsitePopupSettings: SrxWebsitePopupSettings = srxWebsitePopupSettingsSchema.parse({});

export function parseSrxWebsitePopupSettings(input: unknown): SrxWebsitePopupSettings {
  return srxWebsitePopupSettingsSchema.parse(input);
}

export function parseSrxWebsitePopupSettingsState(input: unknown): SrxWebsitePopupSettingsState {
  return srxWebsitePopupSettingsStateSchema.parse(input);
}
