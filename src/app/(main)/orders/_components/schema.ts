// src/app/(main)/kenh/_components/schema.ts
import { z } from "zod";

export const channelSchema = z.object({
  id: z.number(),
  brand: z.string(),
  order_ID: z.string(),
  create_time: z.date(),
  customer_ID: z.string(),
  name_customer: z.string(),
  phone: z.string(),
  address: z.string(),
  seller: z.string(),
  kenh_ban: z.string(),
  note: z.string(),
  tien_hang: z.number(),
  giam_gia: z.number(),
  thanh_tien: z.number(),
  status: z.string(),
  quantity: z.number(),
  pro_ID: z.string(),
  name_pro: z.string(),
  brand_pro: z.string(),
});

export type Channel = z.infer<typeof channelSchema>;
