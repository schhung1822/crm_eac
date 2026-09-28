import "server-only";

import {
  createKiotVietCustomer,
  findKiotVietCustomerByPhone,
  getKiotVietCustomerByCode,
  getKiotVietProductByCode,
  type KiotVietCustomer,
  type KiotVietProduct,
} from "@/lib/kiotviet-client";
import { prisma2 } from "@/lib/prisma2";
import { getKiotVietLinksForOrderItems, getProductEacByCodes } from "@/lib/srx-kiotviet-links";

/** Chi nhánh nhận đơn website: "EAC HCM". */
export const KIOTVIET_WEB_ORDER_BRANCH_ID = 1000000082;

const paymentMethodLabels: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
};

type OrderRow = {
  id: bigint;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  discount_total: unknown;
  shipping_total: unknown;
  grand_total: unknown;
  notes: string | null;
  placed_at: string;
};

type OrderItemRow = {
  product_id: bigint | null;
  variant_id: bigint | null;
  sku: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: unknown;
  quantity: number | bigint;
  product_code: string | null;
  variant_barcode: string | null;
};

/** Dòng đơn đã đổi quantity về number. */
type OrderItem = Omit<OrderItemRow, "quantity"> & { quantity: number };

type AddressRow = {
  recipient_name: string;
  recipient_phone: string;
  province: string;
  district: string;
  ward: string | null;
  address_line: string;
};

export type KiotVietOrderDetail = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
};

export type KiotVietOrderDraft = {
  orderId: string;
  orderNumber: string;
  payload: Record<string, unknown>;
  /** Những điểm cần nhân viên kiểm tra thêm (sản phẩm chưa khớp mã...). */
  warnings: string[];
  customerNote: string;
};

function toNumber(value: unknown): number {
  const numberValue = Number(typeof value === "object" && value !== null ? String(value) : value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "+84 912 345 678" → "0912345678" (định dạng SĐT đang lưu trong KiotViet). */
function toKiotVietPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("84") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
}

async function loadOrder(orderRef: { id?: string; orderNumber?: string }) {
  const orders = await prisma2.$queryRawUnsafe<OrderRow[]>(
    `
      SELECT id, order_number, customer_name, customer_email, customer_phone, payment_method, payment_status,
             discount_total, shipping_total, grand_total, notes,
             DATE_FORMAT(placed_at, '%Y-%m-%dT%H:%i:%s') AS placed_at
      FROM orders
      WHERE ${orderRef.id ? "id = ?" : "order_number = ?"}
      LIMIT 1
    `,
    orderRef.id ? BigInt(orderRef.id) : (orderRef.orderNumber ?? ""),
  );
  const order = orders.at(0);

  if (!order) {
    return null;
  }

  const [items, addresses] = await Promise.all([
    prisma2.$queryRawUnsafe<OrderItemRow[]>(
      `
        SELECT oi.product_id, oi.variant_id, oi.sku, oi.product_name, oi.variant_name, oi.unit_price, oi.quantity,
               p.product_code, v.barcode AS variant_barcode
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN product_variants v ON v.id = oi.variant_id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `,
      order.id,
    ),
    prisma2.$queryRawUnsafe<AddressRow[]>(
      `
        SELECT recipient_name, recipient_phone, province, district, ward, address_line
        FROM order_addresses
        WHERE order_id = ?
        ORDER BY address_type = 'shipping' DESC
        LIMIT 1
      `,
      order.id,
    ),
  ]);

  // quantity là INT UNSIGNED nên Prisma trả về BigInt.
  const normalizedItems = items.map((item) => ({ ...item, quantity: Number(item.quantity) }));

  return { order, items: normalizedItems, address: addresses.at(0) ?? null };
}

/** Mã KiotViet cho từng dòng đơn: liên kết đã cấu hình, không có thì tự dò theo mã vạch biến thể / SKU / mã sản phẩm. */
async function resolveItemCodes(items: OrderItem[]): Promise<{ procode: string; quantity: number }[][]> {
  const linked = await getKiotVietLinksForOrderItems(
    items.map((item) => ({ productId: item.product_id, variantId: item.variant_id })),
  );
  const fallbackCandidates = items.map((item) =>
    [item.variant_barcode, item.sku, item.product_code].map((code) => code?.trim() ?? "").filter(Boolean),
  );
  const eacByCode = await getProductEacByCodes(fallbackCandidates.flat());

  return items.map((_, index) => {
    if (linked[index].length > 0) {
      return linked[index];
    }

    const code = fallbackCandidates[index].find((candidate) => eacByCode.has(candidate));
    return code ? [{ procode: code, quantity: 1 }] : [];
  });
}

async function buildOrderDetails(items: OrderItem[], warnings: string[]): Promise<KiotVietOrderDetail[]> {
  const itemCodes = await resolveItemCodes(items);
  const productCache = new Map<string, KiotVietProduct | null>();
  const getProduct = async (code: string) => {
    if (!productCache.has(code)) {
      productCache.set(code, await getKiotVietProductByCode(code));
    }

    return productCache.get(code) ?? null;
  };
  const details: KiotVietOrderDetail[] = [];

  for (const [index, item] of items.entries()) {
    const label = `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ""} x${item.quantity}`;
    const components = [];

    for (const link of itemCodes[index]) {
      const product = await getProduct(link.procode);

      if (!product) {
        warnings.push(`Mã ${link.procode} của "${label}" không có trên KiotViet`);
        continue;
      }

      components.push({ product, quantity: link.quantity });
    }

    if (components.length === 0) {
      if (itemCodes[index].length === 0) {
        warnings.push(`"${label}" chưa liên kết sản phẩm KiotViet`);
      }

      continue;
    }

    // Giá gốc của dòng chia cho các thành phần combo theo giá bán KiotViet của từng thành phần.
    const grossTotal = toNumber(item.unit_price) * item.quantity;
    const weights = components.map((component) => component.product.basePrice * component.quantity);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    components.forEach((component, componentIndex) => {
      const share =
        totalWeight > 0 ? (grossTotal * weights[componentIndex]) / totalWeight : grossTotal / components.length;
      const quantity = item.quantity * component.quantity;

      details.push({
        productId: component.product.id,
        productCode: component.product.code,
        productName: component.product.name,
        quantity,
        price: roundMoney(share / quantity),
        discount: 0,
      });
    });
  }

  return details;
}

type CustomerResolution = { customer: KiotVietCustomer | null; note: string };

/** Khách đã có trên KiotViet: theo mã trong bảng customer (khớp SĐT), không có thì tìm theo SĐT trên KiotViet. */
async function findExistingKiotVietCustomer(phone: string): Promise<CustomerResolution | null> {
  const localRows = await prisma2.$queryRawUnsafe<{ customer_ID: string | null }[]>(
    "SELECT customer_ID FROM customer WHERE phone = ? AND customer_ID IS NOT NULL ORDER BY id DESC LIMIT 1",
    phone,
  );
  const localCode = localRows.at(0)?.customer_ID?.trim();
  const byCode = localCode ? await getKiotVietCustomerByCode(localCode) : null;

  if (byCode) {
    return { customer: byCode, note: `Khách cũ ${byCode.code} (theo bảng customer)` };
  }

  const byPhone = await findKiotVietCustomerByPhone(phone);
  return byPhone ? { customer: byPhone, note: `Khách cũ ${byPhone.code} (tìm theo SĐT trên KiotViet)` } : null;
}

/** Khách cũ thì gắn theo ID KiotViet; khách mới thì tạo trên KiotViet (chỉ khi createIfMissing). */
async function resolveCustomer(
  order: OrderRow,
  phone: string,
  fullAddress: string,
  createIfMissing: boolean,
): Promise<CustomerResolution> {
  if (!phone) {
    return { customer: null, note: "Đơn không có SĐT, không gắn khách hàng" };
  }

  const existing = await findExistingKiotVietCustomer(phone);

  if (existing) {
    return existing;
  }

  if (!createIfMissing) {
    return { customer: null, note: "Khách mới, sẽ được tạo trên KiotViet khi gửi đơn" };
  }

  const created = await createKiotVietCustomer({
    name: order.customer_name,
    contactNumber: phone,
    address: fullAddress,
    email: order.customer_email ?? undefined,
    branchId: KIOTVIET_WEB_ORDER_BRANCH_ID,
    comments: `Tạo từ đơn website ${order.order_number}`,
  });

  return { customer: created, note: `Đã tạo khách mới ${created.code} trên KiotViet` };
}

function buildFullAddress(address: AddressRow | null): string {
  if (!address) {
    return "";
  }

  // Địa chỉ sau sáp nhập chỉ còn 2 cấp: district trùng ward thì bỏ bớt một lần.
  const district = address.district === address.ward ? "" : address.district;

  return [address.address_line, address.ward, district, address.province]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}

function buildDescription(order: OrderRow, warnings: string[]): string {
  const paidSuffix = order.payment_status === "paid" ? " (đã thanh toán)" : "";
  const customerNote = order.notes?.trim() ?? "";

  return [
    `Đơn website ${order.order_number}`,
    `Thanh toán: ${paymentMethodLabels[order.payment_method] ?? order.payment_method}${paidSuffix}`,
    customerNote ? `Ghi chú khách: ${customerNote}` : "",
    warnings.length > 0 ? `CẦN BỔ SUNG: ${warnings.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Đơn đã thanh toán trên web thì ghi nhận tiền khách trả luôn; còn lại để 0. */
function buildPaymentFields(order: OrderRow): Record<string, unknown> {
  if (order.payment_status !== "paid") {
    return { totalPayment: 0 };
  }

  return {
    totalPayment: toNumber(order.grand_total),
    method: order.payment_method === "bank_transfer" ? "Transfer" : "Cash",
  };
}

/**
 * Dựng dữ liệu đơn KiotViet từ đơn website.
 * createCustomer = false: chỉ đọc (xem trước), không tạo gì trên KiotViet.
 */
export async function buildKiotVietOrderDraft(
  orderRef: { id?: string; orderNumber?: string },
  { createCustomer }: { createCustomer: boolean },
): Promise<KiotVietOrderDraft | null> {
  const loaded = await loadOrder(orderRef);

  if (!loaded) {
    return null;
  }

  const { order, items, address } = loaded;
  const warnings: string[] = [];
  const fullAddress = buildFullAddress(address);
  const phone = toKiotVietPhone(order.customer_phone.trim() ? order.customer_phone : (address?.recipient_phone ?? ""));
  const orderDetails = await buildOrderDetails(items, warnings);
  const { customer, note: customerNote } = await resolveCustomer(order, phone, fullAddress, createCustomer);

  const payload: Record<string, unknown> = {
    branchId: KIOTVIET_WEB_ORDER_BRANCH_ID,
    purchaseDate: order.placed_at,
    ...(customer ? { customerId: customer.id } : {}),
    description: buildDescription(order, warnings),
    usingCod: order.payment_method === "cod",
    discount: toNumber(order.discount_total),
    ...buildPaymentFields(order),
    orderDetails,
    orderDelivery: {
      receiver: address?.recipient_name ?? order.customer_name,
      contactNumber: address ? toKiotVietPhone(address.recipient_phone) : phone,
      address: fullAddress,
      price: toNumber(order.shipping_total),
    },
  };

  return {
    orderId: order.id.toString(),
    orderNumber: order.order_number,
    payload,
    warnings,
    customerNote,
  };
}
