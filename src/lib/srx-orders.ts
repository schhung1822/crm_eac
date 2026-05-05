/* eslint-disable max-lines */
/* eslint-disable import/no-unresolved */
import "server-only";

import { prisma2 } from "@/lib/prisma2";
import { withSrxReadFallback } from "@/lib/srx-db-errors";
import {
  parseSrxOrderUpdateInput,
  srxOrderSchema,
  srxOrderStatusValues,
  type SrxOrder,
  type SrxOrderUpdateInput,
} from "@/lib/srx-orders.shared";

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function formatFullAddress(address: {
  address_line: string;
  ward: string | null;
  district: string;
  province: string;
}): string {
  return [address.address_line, address.ward, address.district, address.province].filter(Boolean).join(", ");
}

function toNumber(value: { toString(): string } | number): number {
  return Number(typeof value === "number" ? value : value.toString());
}

// eslint-disable-next-line complexity
function mapOrder(order: {
  id: bigint;
  order_number: string;
  user_id: bigint | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  order_status: (typeof srxOrderStatusValues)[number];
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  payment_method: "cod" | "bank_transfer" | "card" | "e_wallet";
  subtotal: { toString(): string };
  discount_total: { toString(): string };
  shipping_total: { toString(): string };
  tax_total: { toString(): string };
  grand_total: { toString(): string };
  notes: string | null;
  placed_at: Date;
  paid_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  users: { id: bigint; full_name: string; email: string } | null;
  order_items: Array<{
    id: bigint;
    product_id: bigint | null;
    variant_id: bigint | null;
    sku: string | null;
    product_name: string;
    variant_name: string | null;
    unit_price: { toString(): string };
    quantity: number;
    discount_amount: { toString(): string };
    line_total: { toString(): string };
    created_at: Date;
  }>;
  order_addresses: Array<{
    id: bigint;
    address_type: "shipping" | "billing";
    recipient_name: string;
    recipient_phone: string;
    country_code: string;
    province: string;
    district: string;
    ward: string | null;
    address_line: string;
    postal_code: string | null;
    created_at: Date;
  }>;
  order_status_histories: Array<{
    id: bigint;
    status: (typeof srxOrderStatusValues)[number];
    note: string | null;
    changed_at: Date;
    changed_by_user_id: bigint | null;
    users: { full_name: string; email: string } | null;
  }>;
}): SrxOrder {
  const shippingAddress = order.order_addresses.find((address) => address.address_type === "shipping") ?? null;

  return srxOrderSchema.parse({
    id: order.id.toString(),
    order_number: order.order_number,
    user_id: order.user_id?.toString() ?? "",
    user_name: order.users?.full_name ?? "",
    user_email: order.users?.email ?? "",
    customer_name: order.customer_name,
    customer_email: normalizeOptionalString(order.customer_email),
    customer_phone: order.customer_phone,
    order_status: order.order_status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    subtotal: toNumber(order.subtotal),
    discount_total: toNumber(order.discount_total),
    shipping_total: toNumber(order.shipping_total),
    tax_total: toNumber(order.tax_total),
    grand_total: toNumber(order.grand_total),
    notes: normalizeOptionalString(order.notes),
    placed_at: order.placed_at,
    paid_at: order.paid_at,
    completed_at: order.completed_at,
    cancelled_at: order.cancelled_at,
    created_at: order.created_at,
    updated_at: order.updated_at,
    item_count: order.order_items.length,
    total_quantity: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    shipping_recipient_name: shippingAddress?.recipient_name ?? "",
    shipping_recipient_phone: shippingAddress?.recipient_phone ?? "",
    shipping_address: shippingAddress ? formatFullAddress(shippingAddress) : "",
    items: order.order_items.map((item) => ({
      id: item.id.toString(),
      product_id: item.product_id?.toString() ?? "",
      variant_id: item.variant_id?.toString() ?? "",
      sku: normalizeOptionalString(item.sku),
      product_name: item.product_name,
      variant_name: normalizeOptionalString(item.variant_name),
      unit_price: toNumber(item.unit_price),
      quantity: item.quantity,
      discount_amount: toNumber(item.discount_amount),
      line_total: toNumber(item.line_total),
      created_at: item.created_at,
    })),
    addresses: order.order_addresses.map((address) => ({
      id: address.id.toString(),
      address_type: address.address_type,
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      country_code: address.country_code,
      province: address.province,
      district: address.district,
      ward: normalizeOptionalString(address.ward),
      address_line: address.address_line,
      postal_code: normalizeOptionalString(address.postal_code),
      full_address: formatFullAddress(address),
      created_at: address.created_at,
    })),
    history: order.order_status_histories.map((history) => ({
      id: history.id.toString(),
      status: history.status,
      note: normalizeOptionalString(history.note),
      changed_at: history.changed_at,
      changed_by_user_id: history.changed_by_user_id?.toString() ?? "",
      changed_by_name: history.users?.full_name ?? "",
      changed_by_email: history.users?.email ?? "",
    })),
  });
}

async function resolveExistingActorUserId(userId: number | null | undefined): Promise<bigint | null> {
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const existingUser = await prisma2.users.findUnique({
    where: {
      id: BigInt(userId),
    },
    select: {
      id: true,
    },
  });

  return existingUser?.id ?? null;
}

export { parseSrxOrderUpdateInput };

export async function getPendingSrxOrderCount(): Promise<number> {
  return withSrxReadFallback("pending orders", 0, async () => {
    return prisma2.orders.count({
      where: {
        order_status: "pending",
      },
    });
  });
}

export async function getSrxOrders(): Promise<SrxOrder[]> {
  return withSrxReadFallback("orders", [], async () => {
    const orders = await prisma2.orders.findMany({
      orderBy: [{ placed_at: "desc" }, { id: "desc" }],
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        order_items: {
          select: {
            id: true,
            product_id: true,
            variant_id: true,
            sku: true,
            product_name: true,
            variant_name: true,
            unit_price: true,
            quantity: true,
            discount_amount: true,
            line_total: true,
            created_at: true,
          },
        },
        order_addresses: {
          where: {
            address_type: "shipping",
          },
          select: {
            id: true,
            address_type: true,
            recipient_name: true,
            recipient_phone: true,
            country_code: true,
            province: true,
            district: true,
            ward: true,
            address_line: true,
            postal_code: true,
            created_at: true,
          },
        },
      },
    });

    return orders.map((order) =>
      mapOrder({
        ...order,
        order_status: order.order_status as (typeof srxOrderStatusValues)[number],
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        order_status_histories: [],
      }),
    );
  });
}

export async function getSrxOrderById(orderId: string): Promise<SrxOrder | null> {
  return withSrxReadFallback("order detail", null, async () => {
    const order = await prisma2.orders.findUnique({
      where: {
        id: BigInt(orderId),
      },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        order_items: {
          orderBy: [{ id: "asc" }],
          select: {
            id: true,
            product_id: true,
            variant_id: true,
            sku: true,
            product_name: true,
            variant_name: true,
            unit_price: true,
            quantity: true,
            discount_amount: true,
            line_total: true,
            created_at: true,
          },
        },
        order_addresses: {
          orderBy: [{ address_type: "asc" }],
          select: {
            id: true,
            address_type: true,
            recipient_name: true,
            recipient_phone: true,
            country_code: true,
            province: true,
            district: true,
            ward: true,
            address_line: true,
            postal_code: true,
            created_at: true,
          },
        },
        order_status_histories: {
          include: {
            users: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changed_at: "desc",
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    return mapOrder({
      ...order,
      order_status: order.order_status as (typeof srxOrderStatusValues)[number],
      payment_status: order.payment_status,
      payment_method: order.payment_method,
    });
  });
}

export async function updateSrxOrder(
  orderId: string,
  input: SrxOrderUpdateInput,
  changedByUserId?: number | null,
): Promise<SrxOrder | null> {
  const payload = parseSrxOrderUpdateInput(input);
  const numericId = BigInt(orderId);

  const existing = await prisma2.orders.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      order_status: true,
      payment_status: true,
      paid_at: true,
      completed_at: true,
      cancelled_at: true,
    },
  });

  if (!existing) {
    return null;
  }

  const actorUserId = await resolveExistingActorUserId(changedByUserId);
  const statusChanged = existing.order_status !== payload.order_status;
  const now = new Date();

  await prisma2.$transaction(async (tx) => {
    await tx.orders.update({
      where: {
        id: numericId,
      },
      data: {
        order_status: payload.order_status,
        payment_status: payload.payment_status,
        notes: normalizeNullableString(payload.notes),
        paid_at:
          payload.payment_status === "paid"
            ? (existing.paid_at ?? now)
            : payload.payment_status === "pending" || payload.payment_status === "failed"
              ? null
              : existing.paid_at,
        completed_at: payload.order_status === "completed" ? (existing.completed_at ?? now) : null,
        cancelled_at: payload.order_status === "cancelled" ? (existing.cancelled_at ?? now) : null,
      },
    });

    if (statusChanged) {
      await tx.order_status_histories.create({
        data: {
          order_id: numericId,
          status: payload.order_status,
          note: normalizeNullableString(payload.status_note),
          changed_by_user_id: actorUserId,
        },
      });
    }
  });

  return getSrxOrderById(orderId);
}
