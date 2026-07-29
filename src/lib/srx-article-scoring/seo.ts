/* eslint-disable complexity -- bộ tiêu chí là một danh sách điều kiện phẳng, tách hàm sẽ khó đối chiếu với checklist gốc. */
// Chấm điểm SEO on-page. Port từ GEO-Report-AI (src/lib/seo/score.ts), hàm thuần.
import {
  computeSrxScore,
  countInternalLinks,
  countKeyword,
  fold,
  type SrxArticleScoreInput,
  type SrxScoreCheck,
  type SrxScoreResult,
} from "./types";

const wordCount = (markdown: string) => markdown.trim().split(/\s+/).filter(Boolean).length;
const headingCount = (markdown: string) => (markdown.match(/^#{2,3}\s/gm) ?? []).length;

function subheadings(markdown: string): string[] {
  return [...markdown.matchAll(/^#{2,3}\s+(.*)$/gm)].map((match) => fold(match[1]));
}

function hasOutbound(markdown: string): boolean {
  return /(^|[^!])\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(markdown);
}

function avgParagraphWords(markdown: string): number {
  const paragraphs = markdown.split(/\n{2,}/).filter((p) => p.trim() && !p.startsWith("#"));

  if (paragraphs.length === 0) {
    return 0;
  }

  return paragraphs.reduce((sum, p) => sum + wordCount(p), 0) / paragraphs.length;
}

export function scoreSrxSeo(input: SrxArticleScoreInput): SrxScoreResult {
  const keyword = fold((input.targetKeyword ?? "").trim());
  const markdown = input.markdown;
  const markdownFold = fold(markdown);
  // Bỏ ký tự markup trước khi lấy 100 từ đầu để keyword dính markup vẫn khớp.
  const first100 = markdownFold
    .replace(/[#*_`~>[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 100)
    .join(" ");
  const meta = input.metaDescription ?? "";
  const metaFold = fold(meta);
  const titleFold = fold(input.title);
  const slugFold = fold(input.slug ?? "");
  const internal = input.internalLinkCount ?? countInternalLinks(markdown);
  const words = wordCount(markdown);
  const density =
    keyword && words ? (countKeyword(markdownFold, keyword) * (keyword.split(/\s+/).length || 1)) / words : 0;

  const checks: SrxScoreCheck[] = [
    {
      id: "title",
      label: "Tiêu đề ≤ 60 ký tự và chứa từ khoá chính",
      weight: 12,
      state:
        input.title.length > 0 && input.title.length <= 60 && (!keyword || titleFold.includes(keyword))
          ? "pass"
          : input.title.length <= 70
            ? "warn"
            : "fail",
    },
    {
      id: "meta",
      label: "Mô tả meta dài 120–155 ký tự",
      weight: 8,
      state:
        meta.length >= 120 && meta.length <= 155 ? "pass" : meta.length > 0 && meta.length <= 170 ? "warn" : "fail",
      detail: meta.length > 0 ? `${meta.length} ký tự` : undefined,
    },
    {
      id: "kwInMeta",
      label: "Từ khoá xuất hiện trong mô tả meta",
      weight: 5,
      state: !keyword || metaFold.includes(keyword) ? "pass" : "warn",
    },
    {
      id: "slug",
      label: "Đường dẫn ngắn và chứa từ khoá",
      weight: 6,
      state:
        slugFold.length > 0 && slugFold.length <= 60 && (!keyword || slugFold.includes(keyword.replace(/\s+/g, "-")))
          ? "pass"
          : slugFold.length > 0 && slugFold.length <= 60
            ? "warn"
            : "fail",
    },
    {
      id: "headings",
      label: "Có heading H2/H3 phân cấp rõ",
      weight: 8,
      state: headingCount(markdown) >= 3 ? "pass" : headingCount(markdown) >= 1 ? "warn" : "fail",
      detail: `${headingCount(markdown)} heading`,
    },
    {
      id: "kwInHeading",
      label: "Từ khoá xuất hiện trong ít nhất 1 heading",
      weight: 7,
      state: !keyword || subheadings(markdown).some((h) => h.includes(keyword)) ? "pass" : "warn",
    },
    {
      id: "kwFirst100",
      label: "Từ khoá xuất hiện trong 100 từ đầu",
      weight: 8,
      state: !keyword || first100.includes(keyword) ? "pass" : "fail",
    },
    {
      id: "coverage",
      label: "Bài đủ dài để phủ chủ đề (≥ 800 từ)",
      weight: 12,
      state: words >= 800 ? "pass" : words >= 400 ? "warn" : "fail",
      detail: `${words} từ`,
    },
    {
      id: "internalLinks",
      label: "Có ít nhất 2 liên kết nội bộ",
      weight: 8,
      state: internal >= 2 ? "pass" : internal === 1 ? "warn" : "fail",
      detail: `${internal} liên kết`,
    },
    {
      id: "outbound",
      label: "Có liên kết ra nguồn ngoài uy tín",
      weight: 6,
      state: hasOutbound(markdown) ? "pass" : "warn",
    },
    {
      id: "images",
      label: "Có hình ảnh kèm thuộc tính alt",
      weight: 7,
      state: /!\[[^\]]+\]\([^)]+\)/.test(markdown) ? "pass" : "fail",
    },
    {
      id: "readability",
      label: "Đoạn văn ngắn, dễ đọc",
      weight: 5,
      state: avgParagraphWords(markdown) <= 80 ? "pass" : "warn",
      detail: `${Math.round(avgParagraphWords(markdown))} từ/đoạn`,
    },
    {
      id: "density",
      label: "Mật độ từ khoá hợp lý, không nhồi nhét",
      weight: 4,
      state: !keyword || density <= 0.035 ? "pass" : "warn",
      detail: keyword ? `${(density * 100).toFixed(1)}%` : undefined,
    },
  ];

  return computeSrxScore(checks);
}
