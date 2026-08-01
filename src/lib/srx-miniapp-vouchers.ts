import "server-only";

import { prisma2 } from "@/lib/prisma2";

import { Prisma } from "../../prisma/generated/srx-app-client";

/**
 * Voucher công khai cho Zalo Mini App, lấy từ bảng `discount_codes` của website SRX.
 *
 * Chỉ lấy mã có `class = 'public'`, đang bật, còn trong thời gian áp dụng và chưa dùng hết
 * lượt. Truy vấn bằng SQL thô vì cột `class` chưa có trong prisma/schema2.prisma (Prisma
 * Client được sinh từ schema đó nên không biết cột này).
 */

const PUBLIC_VOUCHER_CLASS = "public";

export type MiniAppVoucher = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  scopeType: string;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

type VoucherRow = {
  id: bigint;
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: Prisma.Decimal | number | string;
  max_discount_amount: Prisma.Decimal | number | string | null;
  min_order_amount: Prisma.Decimal | number | string | null;
  scope_type: string;
  per_user_limit: number | null;
  starts_at: Date | null;
  ends_at: Date | null;
};

function toNumber(value: Prisma.Decimal | number | string | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value.toString());

  return Number.isFinite(parsed) ? parsed : null;
}

function mapVoucher(row: VoucherRow): MiniAppVoucher {
  return {
    id: row.id.toString(),
    code: row.code,
    name: row.name,
    description: String(row.description ?? "").trim(),
    discountType: row.discount_type,
    discountValue: toNumber(row.discount_value) ?? 0,
    maxDiscountAmount: toNumber(row.max_discount_amount),
    minOrderAmount: toNumber(row.min_order_amount),
    scopeType: row.scope_type,
    perUserLimit: row.per_user_limit === null ? null : Number(row.per_user_limit),
    startsAt: row.starts_at ? row.starts_at.toISOString() : null,
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
  };
}

let classColumnPromise: Promise<boolean> | null = null;

/**
 * Thiếu cột `class` thì không có cách nào phân biệt mã công khai với mã riêng, nên trả về
 * danh sách rỗng thay vì lỡ để lộ mã nội bộ ra Mini App.
 */
async function hasClassColumn(): Promise<boolean> {
  classColumnPromise ??= (async () => {
    try {
      const rows = await prisma2.$queryRaw<Array<{ Field: string }>>(
        Prisma.sql`SHOW COLUMNS FROM discount_codes WHERE Field = 'class'`,
      );

      return rows.length > 0;
    } catch (error) {
      console.error("Failed to inspect discount_codes.class column:", error);
      return false;
    }
  })();

  return classColumnPromise;
}

export async function getMiniAppPublicVouchers(): Promise<MiniAppVoucher[]> {
  if (!(await hasClassColumn())) {
    console.warn("Bảng discount_codes chưa có cột `class`; bỏ qua danh sách voucher công khai.");
    return [];
  }

  const rows = await prisma2.$queryRaw<VoucherRow[]>(Prisma.sql`
    SELECT
      d.id,
      d.code,
      d.name,
      d.description,
      d.discount_type,
      d.discount_value,
      d.max_discount_amount,
      d.min_order_amount,
      d.scope_type,
      d.per_user_limit,
      d.starts_at,
      d.ends_at
    FROM discount_codes d
    WHERE d.class = ${PUBLIC_VOUCHER_CLASS}
      AND d.is_active = 1
      AND (d.starts_at IS NULL OR d.starts_at <= NOW())
      AND (d.ends_at IS NULL OR d.ends_at >= NOW())
      AND (
        d.total_usage_limit IS NULL
        OR (
          SELECT COUNT(*)
          FROM discount_code_redemptions r
          WHERE r.discount_code_id = d.id AND r.status = 'applied'
        ) < d.total_usage_limit
      )
    -- Mã sắp hết hạn lên trước; mã không có hạn xếp cuối.
    ORDER BY d.ends_at IS NULL ASC, d.ends_at ASC, d.created_at DESC
  `);

  return rows.map((row) => mapVoucher(row));
}
