// Kiểu dùng chung cho chấm điểm SEO / AEO / GEO.
// Port từ dự án GEO-Report-AI (src/lib/scoring/types.ts) và giữ nguyên công thức
// để điểm số giữa hai hệ thống khớp nhau.

export type SrxCheckState = "pass" | "warn" | "fail";

export type SrxScoreCheck = {
  id: string;
  label: string;
  weight: number;
  state: SrxCheckState;
  detail?: string;
};

export type SrxScoreResult = {
  /** 0-100 */
  score: number;
  checks: SrxScoreCheck[];
};

/** Đầu vào tối thiểu để chấm điểm một bài. */
export type SrxArticleScoreInput = {
  title: string;
  metaDescription?: string;
  slug?: string;
  /** Nội dung đã chuyển sang markdown. */
  markdown: string;
  locale: string;
  targetKeyword?: string;
  internalLinkCount?: number;
  hasFaqSchema?: boolean;
};

/** Bỏ dấu + thường hoá để so khớp keyword nhất quán giữa các module. */
export function fold(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Đếm số lần keyword xuất hiện theo ranh giới từ (Unicode) — tránh đếm "test"
 * trong "testing". Cụm nhiều từ cho phép khoảng trắng linh hoạt.
 * Cả text lẫn keyword nên được fold() trước khi gọi.
 */
export function countKeyword(text: string, keyword: string): number {
  if (!keyword) {
    return 0;
  }

  const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");

  try {
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu");

    return (text.match(regex) ?? []).length;
  } catch {
    return text.split(keyword).length - 1;
  }
}

/** Đếm internal link [text](/path) hoặc (#anchor) — không tính ảnh. */
export function countInternalLinks(markdown: string): number {
  return (markdown.match(/(?<!!)\[[^\]]+\]\((\/[^)]*|#[^)]*)\)/g) ?? []).length;
}

/**
 * Dựng đầu vào chấm điểm thống nhất. Mọi nơi (editor, chấm lại bài cũ, sinh bài)
 * đều phải dùng hàm này để điểm không lệch giữa các màn hình.
 */
export function buildSrxScoreInput(input: {
  title: string;
  metaDescription?: string;
  slug?: string;
  markdown: string;
  locale?: string;
  targetKeyword?: string;
}): SrxArticleScoreInput {
  return {
    title: input.title,
    metaDescription: input.metaDescription,
    slug: input.slug,
    markdown: input.markdown,
    locale: input.locale ?? "vi",
    targetKeyword: input.targetKeyword,
    internalLinkCount: countInternalLinks(input.markdown),
    hasFaqSchema: /(^|\n)#{2,3}\s*(faq|câu hỏi thường gặp)\b/i.test(input.markdown),
  };
}

/** Quy đổi check sang điểm 0-100 theo trọng số (pass=1, warn=0.5, fail=0). */
export function computeSrxScore(checks: SrxScoreCheck[]): SrxScoreResult {
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earned = checks.reduce((sum, check) => {
    const factor = check.state === "pass" ? 1 : check.state === "warn" ? 0.5 : 0;

    return sum + check.weight * factor;
  }, 0);

  return { score: Math.round((earned / totalWeight) * 100), checks };
}
