/** Slot màu series theo thứ tự cố định (định nghĩa trong globals.css). Không xoay vòng quá 6 slot. */
export const SERIES_COLORS = [
  "var(--report-series-1)",
  "var(--report-series-2)",
  "var(--report-series-3)",
  "var(--report-series-4)",
  "var(--report-series-5)",
  "var(--report-series-6)",
] as const;

export const OTHER_COLOR = "var(--report-series-other)";
export const PRIMARY_SERIES_COLOR = SERIES_COLORS[0];

/** Kênh B2C quen thuộc luôn giữ cùng một màu, dù lọc thời gian làm đổi thứ hạng. */
const PREFERRED_CHANNEL_SLOTS: Array<{ keyword: string; slot: number }> = [
  { keyword: "tiktok", slot: 0 },
  { keyword: "tik tok", slot: 0 },
  { keyword: "shopee", slot: 1 },
  { keyword: "web", slot: 2 },
];

/**
 * Gán màu cho từng kênh: kênh quen thuộc lấy slot riêng, kênh khác lấy slot trống kế tiếp
 * theo thứ tự đầu vào; hết slot thì dùng màu "Khác".
 */
export function buildChannelColors(channels: string[]) {
  const colors = new Map<string, string>();
  const usedSlots = new Set<number>();

  for (const channel of channels) {
    const normalized = channel.toLowerCase();
    const preferred = PREFERRED_CHANNEL_SLOTS.find((item) => normalized.includes(item.keyword));

    if (preferred && !usedSlots.has(preferred.slot)) {
      colors.set(channel, SERIES_COLORS[preferred.slot]);
      usedSlots.add(preferred.slot);
    }
  }

  for (const channel of channels) {
    if (colors.has(channel)) continue;

    const slot = SERIES_COLORS.findIndex((_, index) => !usedSlots.has(index));

    if (slot === -1) {
      colors.set(channel, OTHER_COLOR);
    } else {
      colors.set(channel, SERIES_COLORS[slot]);
      usedSlots.add(slot);
    }
  }

  return colors;
}

/** Quy tắc theo thứ tự ưu tiên: "Hoàn thành" phải khớp trước "hoàn" (hoàn trả). */
const STATUS_COLOR_RULES: Array<{ keywords: string[]; color: string }> = [
  { keywords: ["hoàn thành", "thành công", "đã giao"], color: "var(--report-status-good)" },
  { keywords: ["hủy", "huỷ", "không giao"], color: "var(--report-status-critical)" },
  { keywords: ["trả", "hoàn"], color: "var(--report-status-serious)" },
  { keywords: ["xử lý", "xác nhận", "chờ", "đang giao", "mới"], color: "var(--report-status-warning)" },
];

/** Màu trạng thái mang nghĩa (tốt / đang chờ / hoàn trả / hủy), luôn đi kèm nhãn chữ. */
export function getStatusColor(status: string) {
  const normalized = status.toLocaleLowerCase("vi-VN");
  const rule = STATUS_COLOR_RULES.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));

  return rule?.color ?? "var(--report-status-neutral)";
}
