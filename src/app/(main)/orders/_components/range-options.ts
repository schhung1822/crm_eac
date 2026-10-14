export const ORDER_RANGE_OPTIONS = [
  { key: "30d", label: "30 ngày", days: 30 },
  { key: "90d", label: "90 ngày", days: 90 },
  { key: "365d", label: "1 năm", days: 365 },
  { key: "all", label: "Tất cả", days: null },
] as const;

export type OrderRangeKey = (typeof ORDER_RANGE_OPTIONS)[number]["key"];

export const DEFAULT_ORDER_RANGE: OrderRangeKey = "90d";

// Số dòng tối đa gửi xuống trình duyệt, để trang không bị nặng khi chọn "Tất cả".
export const ORDER_ROW_LIMIT = 10_000;

export function resolveOrderRange(value?: string): OrderRangeKey {
  return ORDER_RANGE_OPTIONS.find((option) => option.key === value)?.key ?? DEFAULT_ORDER_RANGE;
}
