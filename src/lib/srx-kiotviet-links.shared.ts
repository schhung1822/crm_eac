import { z } from "zod";

/**
 * Một dòng liên kết sản phẩm website → mã hàng KiotViet (product_eac.procode).
 * variant_sku rỗng = áp dụng cho cả sản phẩm; có SKU = riêng cho biến thể đó.
 * Combo/quà tặng có thể liên kết nhiều mã, mỗi mã kèm số lượng trong 1 đơn vị bán.
 */
export const srxKiotVietLinkSchema = z.object({
  variant_sku: z.string().trim().max(100).default(""),
  procode: z.string().trim().min(1, "Chọn sản phẩm KiotViet").max(100),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const srxKiotVietLinksInputSchema = z.object({
  links: z.array(srxKiotVietLinkSchema).max(200),
});

export const srxProductEacOptionSchema = z.object({
  procode: z.string(),
  name: z.string(),
  base_price: z.number(),
  is_active: z.boolean(),
});

export type SrxKiotVietLink = z.infer<typeof srxKiotVietLinkSchema>;
export type SrxProductEacOption = z.infer<typeof srxProductEacOptionSchema>;
/** Liên kết kèm thông tin sản phẩm product_eac để hiển thị. */
export type SrxKiotVietLinkView = SrxKiotVietLink & { eac: SrxProductEacOption | null };

export function parseSrxKiotVietLinksInput(input: unknown): SrxKiotVietLink[] {
  return srxKiotVietLinksInputSchema.parse(input).links;
}

export function parseSrxProductEacOption(input: unknown): SrxProductEacOption {
  return srxProductEacOptionSchema.parse(input);
}
