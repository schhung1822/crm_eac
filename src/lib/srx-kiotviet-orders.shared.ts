import { z } from "zod";

export const srxKiotVietOrderSyncSchema = z.object({
  status: z.enum(["processing", "synced", "failed"]),
  kiotviet_order_id: z.string(),
  kiotviet_order_code: z.string(),
  warnings: z.array(z.string()),
  error_message: z.string(),
  attempt_count: z.number(),
  updated_at: z.coerce.date(),
  synced_at: z.coerce.date().nullable(),
});

export type SrxKiotVietOrderSync = z.infer<typeof srxKiotVietOrderSyncSchema>;

export function parseSrxKiotVietOrderSync(input: unknown): SrxKiotVietOrderSync {
  return srxKiotVietOrderSyncSchema.parse(input);
}
