// src/app/(main)/dashboard/default/_components/schema.ts
import { z } from "zod";

export const productSchema = z.object({
  pro_ID: z.string(),
  name: z.string(),
  brand: z.string(),
  class: z.string(),
  gia_ban: z.number(),
  gia_von: z.number(),
  property: z.string().optional(),
  isActive: z.boolean(),
  soldQuantity: z.number(),
  salesRevenue: z.number(),
});

export type Product = z.infer<typeof productSchema>;
