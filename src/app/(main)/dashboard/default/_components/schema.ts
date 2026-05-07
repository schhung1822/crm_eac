// src/app/(main)/dashboard/default/_components/schema.ts
import { z } from "zod";

export const channelSchema = z.object({
  id: z.number(),
  order_ID: z.string(),
  brand: z.string(),
  create_time: z.date(),
  customer_ID: z.string(),
  name_customer: z.string(),
  phone: z.string(),
  address: z.string(),
  seller: z.string(),
  kenh_ban: z.string(),
  note: z.string().nullable().optional(),
  tien_hang: z.number().nullable().optional(),
  giam_gia: z.number().nullable().optional(),
  thanh_tien: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  name_pro: z.string().nullable().optional(),
  pro_ID: z.string().nullable().optional(),
  brand_pro: z.string().nullable().optional(),
});

export type Channel = z.infer<typeof channelSchema>;
