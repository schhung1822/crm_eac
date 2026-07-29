// Điểm vào duy nhất cho việc chấm điểm bài viết SRX.
// Bộ tiêu chí port từ dự án GEO-Report-AI; chấm hoàn toàn bằng luật (không gọi AI)
// nên chạy tức thì, miễn phí và cho kết quả nhất quán giữa các màn hình.
import { scoreSrxAeo } from "./aeo";
import { scoreSrxGeo } from "./geo";
import { srxHtmlToMarkdown } from "./html-to-markdown";
import { scoreSrxSeo } from "./seo";
import {
  buildSrxScoreInput,
  type SrxArticleScoreInput,
  type SrxCheckState,
  type SrxScoreCheck,
  type SrxScoreResult,
} from "./types";

export type { SrxArticleScoreInput, SrxCheckState, SrxScoreCheck, SrxScoreResult };
export { srxHtmlToMarkdown, buildSrxScoreInput };

export type SrxArticleReport = {
  /** Điểm trung bình của ba trục, 0-100. */
  overall: number;
  seo: SrxScoreResult;
  aeo: SrxScoreResult;
  geo: SrxScoreResult;
  /** Các tiêu chí đã đạt, gom từ cả ba trục. */
  strengths: string[];
  /** Việc cần làm, ưu tiên tiêu chí trọng số cao đang fail. */
  suggestions: string[];
};

export type SrxArticleScoreArgs = {
  title: string;
  /** Nội dung dạng HTML (CKEditor) hoặc markdown. */
  content: string;
  excerpt?: string;
  slug?: string;
  targetKeyword?: string;
  locale?: string;
  /** Đặt true nếu content đã là markdown, bỏ qua bước chuyển đổi. */
  contentIsMarkdown?: boolean;
};

const AXIS_LABELS = { seo: "SEO", aeo: "AEO", geo: "GEO" } as const;

function collectSuggestions(results: Array<[keyof typeof AXIS_LABELS, SrxScoreResult]>): string[] {
  const pending: Array<{ axis: string; check: SrxScoreCheck; rank: number }> = [];

  for (const [axis, result] of results) {
    for (const check of result.checks) {
      if (check.state === "pass") {
        continue;
      }

      pending.push({
        axis: AXIS_LABELS[axis],
        check,
        // Fail nặng hơn warn; cùng mức thì trọng số cao lên trước.
        rank: (check.state === "fail" ? 1000 : 0) + check.weight,
      });
    }
  }

  return pending
    .sort((left, right) => right.rank - left.rank)
    .map((item) => `[${item.axis}] ${item.check.label}${item.check.detail ? ` (${item.check.detail})` : ""}`);
}

function collectStrengths(results: Array<[keyof typeof AXIS_LABELS, SrxScoreResult]>): string[] {
  return results.flatMap(([axis, result]) =>
    result.checks.filter((check) => check.state === "pass").map((check) => `[${AXIS_LABELS[axis]}] ${check.label}`),
  );
}

export function scoreSrxArticle(args: SrxArticleScoreArgs): SrxArticleReport {
  const markdown = args.contentIsMarkdown ? args.content : srxHtmlToMarkdown(args.content);
  const input = buildSrxScoreInput({
    title: args.title,
    metaDescription: args.excerpt,
    slug: args.slug,
    markdown,
    locale: args.locale ?? "vi",
    targetKeyword: args.targetKeyword,
  });

  const seo = scoreSrxSeo(input);
  const aeo = scoreSrxAeo(input);
  const geo = scoreSrxGeo(input);
  const axes: Array<[keyof typeof AXIS_LABELS, SrxScoreResult]> = [
    ["seo", seo],
    ["aeo", aeo],
    ["geo", geo],
  ];

  return {
    overall: Math.round((seo.score + aeo.score + geo.score) / 3),
    seo,
    aeo,
    geo,
    strengths: collectStrengths(axes),
    suggestions: collectSuggestions(axes),
  };
}
