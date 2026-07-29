/* eslint-disable complexity -- bộ tiêu chí là một danh sách điều kiện phẳng, tách hàm sẽ khó đối chiếu với checklist gốc. */
// Chấm điểm GEO (Generative Engine Optimization) — tối ưu để bài được các LLM
// trích dẫn khi tổng hợp câu trả lời. Port từ GEO-Report-AI (src/lib/geo/score.ts).
import { srxMarkersFor } from "./markers";
import { computeSrxScore, fold, type SrxArticleScoreInput, type SrxScoreCheck, type SrxScoreResult } from "./types";

function subheadings(markdown: string): string[] {
  return [...markdown.matchAll(/^#{2,3}\s+(.*)$/gm)].map((match) => match[1]);
}

/** Dẫn nguồn thật: link markdown ra ngoài, không tính ảnh và internal link. */
function hasExternalCitation(markdown: string): boolean {
  return /(^|[^!])\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(markdown);
}

/**
 * Đếm điểm dữ liệu định lượng thật — thứ mà AI hay trích.
 * Tránh dương tính giả: không tính năm 19xx/20xx đứng một mình.
 */
function statsCount(markdown: string): number {
  let total = 0;

  total += (markdown.match(/\d+(?:[.,]\d+)?\s?%/g) ?? []).length;
  total += (markdown.match(/\b\d{1,3}(?:[.,]\d{3})+\b/g) ?? []).length;
  total += (
    markdown.match(/\b\d+(?:[.,]\d+)?\s?(?:triệu|tỷ|tỉ|nghìn|ngàn|million|billion|thousand|usd|vnd|đ|\$|€|£|¥)/gi) ?? []
  ).length;
  total += (markdown.match(/\b\d{4,}\b/g) ?? []).filter((value) => !/^(?:19|20)\d{2}$/.test(value)).length;

  return total;
}

export function scoreSrxGeo(input: SrxArticleScoreInput): SrxScoreResult {
  const markdown = input.markdown;
  const lower = markdown.toLowerCase();
  const markers = srxMarkersFor(input.locale);
  const firstParagraph = markdown.split(/\n{2,}/).find((p) => p.trim() && !p.startsWith("#")) ?? "";

  const keywordFold = fold((input.targetKeyword ?? "").trim());
  const quickAnswerLengthOk = firstParagraph.length > 40 && firstParagraph.length < 320;
  const hasQuickAnswer =
    markers.quickAnswer.test(firstParagraph) ||
    (quickAnswerLengthOk && (!keywordFold || fold(firstParagraph).includes(keywordFold)));

  const hasQA = /[?？]\s*\n/.test(markdown) || /##[^\n]*[?？]/.test(markdown) || /faq/i.test(markdown);
  const hasList = /^[-*]\s|\n\d+\.\s/m.test(markdown);
  const hasTable = /\|.*\|/.test(markdown);
  const hasDate =
    markers.update.test(lower) ||
    /(?:©|\(c\))\s*20\d{2}\b/.test(markdown) ||
    /(?:updated|last updated|as of|cập nhật|tính đến|hiện tại|tại thời điểm)[^\n]{0,24}\b20\d{2}\b/i.test(lower) ||
    /\b20\d{2}\b[^\n]{0,24}(?:updated|cập nhật)/i.test(lower);

  const heads = subheadings(markdown);
  const questionHeads = heads.filter((h) => /[?？]\s*$/.test(h.trim()) || markers.question.test(h)).length;
  const stats = statsCount(markdown);

  const checks: SrxScoreCheck[] = [
    {
      id: "quotable",
      label: "Có đoạn trả lời ngắn, trích dẫn được",
      weight: 14,
      state: hasQuickAnswer ? "pass" : "fail",
    },
    {
      id: "qa",
      label: "Có cấu trúc hỏi đáp trực tiếp",
      weight: 10,
      state: hasQA ? "pass" : "warn",
    },
    {
      id: "entity",
      label: "Định nghĩa rõ thực thể / khái niệm",
      weight: 8,
      state: markers.entity.test(lower) ? "pass" : "warn",
    },
    {
      id: "sources",
      label: "Dẫn chứng có nguồn (link ra ngoài)",
      weight: 12,
      state: hasExternalCitation(markdown) ? "pass" : "fail",
    },
    {
      id: "format",
      label: "Định dạng dễ trích (list hoặc bảng)",
      weight: 9,
      state: hasList || hasTable ? "pass" : "fail",
    },
    {
      id: "schema",
      label: "Có khối FAQ / structured data",
      weight: 9,
      state: input.hasFaqSchema ? "pass" : "fail",
    },
    {
      id: "stats",
      label: "Có số liệu, dữ liệu cụ thể",
      weight: 7,
      state: stats >= 2 ? "pass" : "warn",
      detail: `${stats} số liệu`,
    },
    {
      id: "questionHeading",
      label: "Có heading dạng câu hỏi",
      weight: 6,
      state: questionHeads >= 1 ? "pass" : "warn",
    },
    {
      id: "freshness",
      label: "Có tín hiệu cập nhật (năm / mới nhất)",
      weight: 7,
      state: hasDate ? "pass" : "warn",
    },
    {
      id: "completeness",
      label: "Bao phủ đủ các câu hỏi liên quan",
      weight: 8,
      state: (markdown.match(/^#{2,3}\s/gm) ?? []).length >= 4 ? "pass" : "warn",
    },
  ];

  return computeSrxScore(checks);
}
