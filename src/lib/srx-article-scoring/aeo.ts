/* eslint-disable complexity -- bộ tiêu chí là một danh sách điều kiện phẳng, tách hàm sẽ khó đối chiếu với checklist gốc. */
// Chấm điểm AEO (Answer Engine Optimization) — tối ưu để nội dung được lấy làm
// câu trả lời trực tiếp: featured snippet, People Also Ask, trợ lý giọng nói.
// Port từ GEO-Report-AI (src/lib/aeo/score.ts).
import { srxMarkersFor } from "./markers";
import { computeSrxScore, fold, type SrxArticleScoreInput, type SrxScoreCheck, type SrxScoreResult } from "./types";

function subheadings(markdown: string): string[] {
  return [...markdown.matchAll(/^#{2,3}\s+(.*)$/gm)].map((match) => match[1]);
}

function paragraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^[#>|]/.test(p) && !/^[-*]\s/.test(p) && !/^\d+\.\s/.test(p));
}

/** Số bước lớn nhất trong một danh sách đánh số liên tiếp (How-To). */
function maxOrderedRun(markdown: string): number {
  let best = 0;
  let current = 0;

  for (const line of markdown.split("\n")) {
    if (/^\s*\d+\.\s+\S/.test(line)) {
      current += 1;
      best = Math.max(best, current);
    } else if (line.trim() !== "") {
      current = 0;
    }
  }

  return best;
}

export function scoreSrxAeo(input: SrxArticleScoreInput): SrxScoreResult {
  const markdown = input.markdown;
  const lower = markdown.toLowerCase();
  const markers = srxMarkersFor(input.locale);
  const heads = subheadings(markdown);
  const paras = paragraphs(markdown);
  const firstPara = paras[0] ?? "";

  const keywordFold = fold((input.targetKeyword ?? "").trim());
  const answerLengthOk = firstPara.length >= 40 && firstPara.length <= 360;
  const answerUpfront =
    markers.quickAnswer.test(firstPara) || (answerLengthOk && (!keywordFold || fold(firstPara).includes(keywordFold)));

  const snippetPara = paras.some((p) => {
    const words = p.split(/\s+/).length;

    return words >= 35 && words <= 65;
  });

  const questionHeads = heads.filter((h) => /[?？]\s*$/.test(h.trim()) || markers.question.test(h)).length;
  const hasQAText = /[?？]\s*\n/.test(markdown) || /##[^\n]*[?？]/.test(markdown) || /faq/i.test(markdown);
  const hasDefinition = markers.entity.test(lower);
  const hasList = /^[-*]\s|\n\d+\.\s/m.test(markdown);
  const hasTable = /\|.*\|/.test(markdown);
  const steps = maxOrderedRun(markdown);

  const keyword = keywordFold;
  const keywordInHeadOrAnswer =
    Boolean(keyword) && (heads.some((h) => fold(h).includes(keyword)) || fold(firstPara).includes(keyword));
  const keywordInBody = Boolean(keyword) && fold(markdown).includes(keyword);
  const hasSummary = markers.quickAnswer.test(lower);
  const concise = paras.length === 0 ? false : paras.filter((p) => p.length <= 600).length / paras.length >= 0.6;

  const checks: SrxScoreCheck[] = [
    {
      id: "answerUpfront",
      label: "Trả lời trực tiếp ngay đầu bài",
      weight: 16,
      state: answerUpfront ? "pass" : "fail",
    },
    {
      id: "snippetLength",
      label: "Có đoạn đúng tầm featured snippet (~40–60 từ)",
      weight: 10,
      state: snippetPara ? "pass" : "warn",
    },
    {
      id: "questionHeadings",
      label: "Heading dạng câu hỏi (People Also Ask)",
      weight: 12,
      state: questionHeads >= 2 ? "pass" : questionHeads === 1 ? "warn" : "fail",
      detail: `${questionHeads} heading câu hỏi`,
    },
    {
      id: "faq",
      label: "Có khối FAQ / Q&A",
      weight: 12,
      state: input.hasFaqSchema ? "pass" : hasQAText ? "warn" : "fail",
    },
    {
      id: "definition",
      label: "Có định nghĩa trực tiếp cho snippet định nghĩa",
      weight: 9,
      state: hasDefinition ? "pass" : "warn",
    },
    {
      id: "listOrTable",
      label: "Có list hoặc bảng dễ rút làm snippet",
      weight: 9,
      state: hasList || hasTable ? "pass" : "fail",
    },
    {
      id: "howto",
      label: "Có các bước How-To (≥ 3 bước đánh số)",
      weight: 8,
      state: steps >= 3 ? "pass" : "warn",
    },
    {
      id: "queryMatch",
      label: "Từ khoá khớp câu trả lời (ở heading hoặc đầu bài)",
      weight: 9,
      state: keywordInHeadOrAnswer ? "pass" : keywordInBody ? "warn" : "fail",
    },
    {
      id: "summary",
      label: "Có khối tóm tắt / điểm chính",
      weight: 7,
      state: hasSummary ? "pass" : "warn",
    },
    {
      id: "concise",
      label: "Câu trả lời súc tích, dễ quét",
      weight: 8,
      state: concise ? "pass" : "warn",
    },
  ];

  return computeSrxScore(checks);
}
