import type { SrxOrder } from "@/lib/srx-orders.shared";

export function getOrderStatusLabel(status: SrxOrder["order_status"]): string {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "processing":
      return "Đang xử lý";
    case "shipping":
      return "Đang giao";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    case "refunded":
      return "Hoàn tiền";
    default:
      return status;
  }
}

export function getPaymentStatusLabel(status: SrxOrder["payment_status"]): string {
  switch (status) {
    case "pending":
      return "Chờ thanh toán";
    case "paid":
      return "Đã thanh toán";
    case "failed":
      return "Thanh toán lỗi";
    case "refunded":
      return "Đã hoàn tiền";
    case "partially_refunded":
      return "Hoàn tiền một phần";
    default:
      return status;
  }
}

export function getPaymentMethodLabel(method: SrxOrder["payment_method"]): string {
  switch (method) {
    case "cod":
      return "COD";
    case "bank_transfer":
      return "Chuyển khoản";
    case "card":
      return "Thẻ";
    case "e_wallet":
      return "Ví điện tử";
    default:
      return method;
  }
}

export function getOrderStatusVariant(status: SrxOrder["order_status"]): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
    case "refunded":
      return "secondary";
    default:
      return "outline";
  }
}

export function getPaymentStatusVariant(status: SrxOrder["payment_status"]): "default" | "secondary" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "failed":
      return "secondary";
    default:
      return "outline";
  }
}

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value)} đ`;
}

export function formatDateTime(value: Date | null): string {
  return value ? value.toLocaleString("vi-VN") : "—";
}
