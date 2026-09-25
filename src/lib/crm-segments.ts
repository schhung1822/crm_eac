export type CrmSegment = "b2b" | "b2c";

/**
 * Từ khóa nhận diện kênh bán B2C (so khớp không phân biệt hoa thường trên cột `kenh_ban`).
 * Kênh nào chứa một trong các từ khóa này là B2C (TikTok, Shopee, Website SRX); còn lại là B2B.
 */
export const B2C_CHANNEL_KEYWORDS = ["tiktok", "tik tok", "shopee", "web"] as const;

export const CRM_SEGMENTS: Record<
  CrmSegment,
  { title: string; shortLabel: string; description: string; path: string }
> = {
  b2b: {
    title: "Báo cáo B2B",
    shortLabel: "B2B",
    description: "Đại lý, khách sỉ và các kênh bán trực tiếp",
    path: "/dashboard/b2b",
  },
  b2c: {
    title: "Báo cáo B2C",
    shortLabel: "B2C",
    description: "TikTok Shop, Shopee và Website SRX",
    path: "/dashboard/b2c",
  },
};

/** Phân loại một kênh bán ở phía client — cùng quy tắc với `buildSegmentClause`. */
export function getChannelSegment(channel: string | null | undefined): CrmSegment {
  const normalized = String(channel ?? "").toLowerCase();
  return B2C_CHANNEL_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? "b2c" : "b2b";
}

/** Điều kiện SQL lọc theo phân khúc; không truyền segment thì không lọc. */
export function buildSegmentClause(segment?: CrmSegment, column = "kenh_ban") {
  if (!segment) {
    return { clause: "", params: [] as string[] };
  }

  const matchB2c = B2C_CHANNEL_KEYWORDS.map(() => `LOWER(COALESCE(${column}, '')) LIKE ?`).join(" OR ");
  const params = B2C_CHANNEL_KEYWORDS.map((keyword) => `%${keyword}%`);

  return {
    clause: segment === "b2c" ? `(${matchB2c})` : `NOT (${matchB2c})`,
    params,
  };
}
