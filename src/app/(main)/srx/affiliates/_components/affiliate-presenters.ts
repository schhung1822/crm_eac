import type {
  SrxAffiliateAccount,
  SrxAffiliateApplication,
  SrxAffiliateApplicationStatus,
} from "@/lib/srx-affiliates.shared";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return value.toLocaleString("vi-VN");
}

export function getAffiliateAccountStatusLabel(status: SrxAffiliateAccount["status"]): string {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "inactive":
      return "Tạm ngưng";
    case "suspended":
      return "Tạm khóa";
    default:
      return status;
  }
}

export function getAffiliateAccountStatusVariant(
  status: SrxAffiliateAccount["status"],
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "inactive":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getAffiliateApplicationStatusLabel(
  status: SrxAffiliateAccount["application_status"] | SrxAffiliateApplication["status"] | SrxAffiliateApplicationStatus,
): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "rejected":
      return "Từ chối";
    default:
      return "Không có hồ sơ";
  }
}

export function getAffiliateApplicationStatusVariant(
  status: SrxAffiliateAccount["application_status"] | SrxAffiliateApplication["status"] | SrxAffiliateApplicationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getAffiliateCommissionTypeLabel(type: SrxAffiliateAccount["commission_type"]): string {
  switch (type) {
    case "percent":
      return "Theo %";
    case "fixed":
      return "Cố định";
    default:
      return type;
  }
}

export function getAffiliateCommissionLabel(account: SrxAffiliateAccount): string {
  if (account.commission_type === "percent") {
    return `${account.commission_rate}%`;
  }

  return formatCurrency(account.commission_rate);
}

export function getAffiliatePayoutStatusLabel(status: SrxAffiliateAccount["latest_payout_status"]): string {
  switch (status) {
    case "pending":
      return "Chờ chi";
    case "processing":
      return "Đang xử lý";
    case "paid":
      return "Đã chi";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Chưa có";
  }
}

export function getAffiliatePayoutStatusVariant(
  status: SrxAffiliateAccount["latest_payout_status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "processing":
      return "secondary";
    case "paid":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}
