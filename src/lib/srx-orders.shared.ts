import { z } from "zod";

export const srxOrderStatusValues = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
  "refunded",
] as const;

export const srxOrderPaymentStatusValues = ["pending", "paid", "failed", "refunded", "partially_refunded"] as const;

export const srxOrderPaymentMethodValues = ["cod", "bank_transfer", "card", "e_wallet"] as const;
export const srxOrderAddressTypeValues = ["shipping", "billing"] as const;

export const srxOrderStatusSchema = z.enum(srxOrderStatusValues);
export const srxOrderPaymentStatusSchema = z.enum(srxOrderPaymentStatusValues);
export const srxOrderPaymentMethodSchema = z.enum(srxOrderPaymentMethodValues);
export const srxOrderAddressTypeSchema = z.enum(srxOrderAddressTypeValues);

export const srxOrderItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  variant_id: z.string(),
  sku: z.string(),
  product_name: z.string(),
  variant_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  discount_amount: z.number(),
  line_total: z.number(),
  created_at: z.coerce.date(),
});

export const srxOrderAddressSchema = z.object({
  id: z.string(),
  address_type: srxOrderAddressTypeSchema,
  recipient_name: z.string(),
  recipient_phone: z.string(),
  country_code: z.string(),
  province: z.string(),
  district: z.string(),
  ward: z.string(),
  address_line: z.string(),
  postal_code: z.string(),
  full_address: z.string(),
  created_at: z.coerce.date(),
});

export const srxOrderHistorySchema = z.object({
  id: z.string(),
  status: srxOrderStatusSchema,
  note: z.string(),
  changed_at: z.coerce.date(),
  changed_by_user_id: z.string(),
  changed_by_name: z.string(),
  changed_by_email: z.string(),
});

export const srxOrderSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string(),
  order_status: srxOrderStatusSchema,
  payment_status: srxOrderPaymentStatusSchema,
  payment_method: srxOrderPaymentMethodSchema,
  subtotal: z.number(),
  discount_total: z.number(),
  shipping_total: z.number(),
  tax_total: z.number(),
  grand_total: z.number(),
  notes: z.string(),
  placed_at: z.coerce.date(),
  paid_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  cancelled_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  item_count: z.number(),
  total_quantity: z.number(),
  shipping_recipient_name: z.string(),
  shipping_recipient_phone: z.string(),
  shipping_address: z.string(),
  items: z.array(srxOrderItemSchema),
  addresses: z.array(srxOrderAddressSchema),
  history: z.array(srxOrderHistorySchema),
});

export type SrxOrder = z.infer<typeof srxOrderSchema>;
export type SrxOrderItem = z.infer<typeof srxOrderItemSchema>;
export type SrxOrderAddress = z.infer<typeof srxOrderAddressSchema>;
export type SrxOrderHistory = z.infer<typeof srxOrderHistorySchema>;

const srxOrderUpdateSchema = z.object({
  order_status: srxOrderStatusSchema,
  payment_status: srxOrderPaymentStatusSchema,
  notes: z.string().trim().max(10000).optional().default(""),
  status_note: z.string().trim().max(255).optional().default(""),
});

export type SrxOrderUpdateInput = z.infer<typeof srxOrderUpdateSchema>;

export function parseSrxOrder(input: unknown): SrxOrder {
  return srxOrderSchema.parse(input);
}

export function parseSrxOrderUpdateInput(input: unknown): SrxOrderUpdateInput {
  return srxOrderUpdateSchema.parse(input);
}
