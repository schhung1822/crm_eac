import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";

const currencyFormatter = new Intl.NumberFormat("vi-VN");
const paidPaymentStatuses = new Set(["completed", "paid", "success", "succeeded"]);

export function formatCurrencyVnd(value: number | null | string | undefined): string {
  return `${currencyFormatter.format(Math.max(Number(value) || 0, 0))} đ`;
}

export function normalizeText(value: unknown, fallback = "Không có"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildShippingAddress(customer: SrxOrdersWebPayload["customer"]): string {
  return [customer.addressLine, customer.ward, customer.district, customer.province]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function formatPaymentStatusLabel(status: string): string {
  return paidPaymentStatuses.has(status.trim().toLowerCase()) ? "Đã thanh toán" : "Chờ thanh toán";
}

export function hasPendingBankTransferPayment(payload: SrxOrdersWebPayload): boolean {
  const paymentMethod = payload.payment.method.trim().toLowerCase();
  const paymentStatus = payload.payment.status.trim().toLowerCase();

  return paymentMethod === "bank_transfer" && !paidPaymentStatuses.has(paymentStatus);
}

export function buildCheckoutPaymentUrl(payload: SrxOrdersWebPayload): null | string {
  const siteOrigin = payload.siteOrigin?.trim();

  if (!siteOrigin || !hasPendingBankTransferPayment(payload)) {
    return null;
  }

  try {
    return new URL(`/checkout/payment/${encodeURIComponent(payload.orderNumber)}`, siteOrigin).toString();
  } catch {
    return null;
  }
}

export function formatOrderItemLines(items: SrxOrdersWebPayload["items"]): string {
  return items
    .map((item) => {
      const itemVariant = normalizeText(item.variantLabel, "");
      const itemLabel = itemVariant ? `${item.name} (${itemVariant})` : item.name;
      const lineTotal = item.lineTotal ?? item.price * item.quantity;
      return `- ${itemLabel} x${item.quantity}: ${formatCurrencyVnd(lineTotal)}`;
    })
    .join("\n");
}
