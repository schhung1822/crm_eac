import { z } from "zod";

const orderItemSchema = z.object({
  discountAmount: z.number().nonnegative().nullish(),
  lineTotal: z.number().nonnegative().nullish(),
  name: z.string().trim().min(1).max(255),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive().max(99),
  sku: z.string().trim().max(120).nullish(),
  variantLabel: z.string().trim().max(255).nullish(),
});

const customerSchema = z.object({
  addressLine: z.string().trim().min(1).max(500),
  countryCode: z.string().trim().max(10).nullish(),
  district: z.string().trim().max(255).nullish(),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(6).max(32),
  postalCode: z.string().trim().max(32).nullish(),
  province: z.string().trim().min(1).max(255),
  ward: z.string().trim().min(1).max(255),
});

const paymentDetailsSchema = z.object({
  accountName: z.string().trim().min(1).max(255),
  accountNumber: z.string().trim().min(1).max(64),
  amount: z.number().nonnegative(),
  bankName: z.string().trim().min(1).max(255),
  transferContent: z.string().trim().min(1).max(255),
});

const paymentSchema = z.object({
  details: paymentDetailsSchema.nullish(),
  method: z.string().trim().min(1).max(64),
  methodLabel: z.string().trim().min(1).max(255),
  status: z.string().trim().min(1).max(64).default("pending"),
});

const totalsSchema = z.object({
  discountTotal: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const srxOrdersWebPayloadSchema = z
  .object({
    customer: customerSchema,
    items: z.array(orderItemSchema).min(1).max(50),
    notes: z.string().trim().max(1000).nullish(),
    orderNumber: z.string().trim().min(1).max(64),
    payment: paymentSchema,
    placedAt: z.string().datetime().nullish(),
    siteOrigin: z.string().trim().url().nullish(),
    source: z.string().trim().max(255).nullish(),
    totals: totalsSchema,
  })
  .strict();

export type SrxOrdersWebPayload = z.infer<typeof srxOrdersWebPayloadSchema>;

export function parseSrxOrdersWebPayload(value: unknown): SrxOrdersWebPayload {
  return srxOrdersWebPayloadSchema.parse(value);
}
