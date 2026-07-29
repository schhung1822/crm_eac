/* eslint-disable complexity, max-lines, @typescript-eslint/prefer-nullish-coalescing -- prompt ghép từ nhiều trường tuỳ chọn: chuỗi rỗng PHẢI rơi về giá trị mặc định nên dùng "||", "??" sẽ giữ lại chuỗi rỗng và làm hỏng prompt. */
import "server-only";

import { srxAiComplete, type SrxAiTextProvider } from "@/lib/srx-ai-provider";
import { scoreSrxArticle, type SrxArticleReport } from "@/lib/srx-article-scoring";

export type SrxWriteArticleInput = {
  /** Bỏ trống thì AI tự đặt tiêu đề. */
  title?: string;
  /** Bỏ trống thì AI tự chọn từ khoá chính. */
  targetKeyword?: string;
  secondaryKeywords?: string[];
  outline?: string[];
  /** Chủ đề / yêu cầu thô của người dùng. */
  brief?: string;
  audience?: string;
  tone?: string;
  categoryName?: string;
  internalLinks?: Array<{ anchor: string; url: string }>;
  provider?: SrxAiTextProvider;
  model?: string;
};

export type SrxWrittenArticle = {
  title: string;
  metaDescription: string;
  slug: string;
  /** Thân bài dạng markdown do model trả về. */
  markdown: string;
  /** Thân bài đã chuyển sang HTML cho CKEditor. */
  html: string;
  faq: Array<{ q: string; a: string }>;
  tags: string[];
  seoNotes: string;
  /** Từ khoá đã dùng để viết và chấm điểm bài này. */
  targetKeyword: string;
  provider: SrxAiTextProvider;
  model: string;
  /** Điểm chấm ngay sau khi sinh, dùng chung bộ tiêu chí với editor. */
  report: SrxArticleReport;
  /** Bản nghiên cứu bước 1, trả về để hiển thị/kiểm tra. */
  research?: string;
};

const WRITER_SYSTEM = `Bạn là cây viết nội dung chuyên nghiệp, chuẩn SEO + AEO + GEO, văn phong tự nhiên (không "AI-ish").
AEO = tối ưu để được CHỌN làm câu trả lời trực tiếp (featured snippet, People Also Ask, trợ lý giọng nói).
GEO = tối ưu để nội dung được engine AI (ChatGPT, Perplexity, Google AI Overviews) trích dẫn.
Bài phải HOÀN CHỈNH, đủ sâu, không sáo rỗng. Mật độ keyword tự nhiên, KHÔNG nhồi.
DẤU CÂU: chỉ dùng gạch nối thường "-"; TUYỆT ĐỐI KHÔNG dùng gạch dài em/en dash.
Luôn trả về DUY NHẤT một object JSON hợp lệ, không kèm giải thích.`;

const RESEARCH_SYSTEM = `Bạn là chuyên viên nghiên cứu nội dung. Trước khi viết bài, hãy lập BẢN NGHIÊN CỨU
ngắn gọn, CHÍNH XÁC để bài viết bám đúng thông tin. KHÔNG bịa số liệu/nguồn cụ thể - nếu không chắc,
ghi rõ "[cần kiểm chứng]". Trả về văn bản dạng bullet, không kèm mở bài.`;

/**
 * Rubric bám đúng bộ tiêu chí chấm điểm trong src/lib/srx-article-scoring — viết theo
 * rubric này thì bài sinh ra sẽ đạt điểm cao ngay từ lần đầu.
 */
const SCORING_RUBRIC = `RUBRIC (bài sẽ được chấm tự động theo đúng các tiêu chí này):
SEO - tiêu đề <= 60 ký tự và chứa từ khoá; meta description 120-155 ký tự và chứa từ khoá;
slug ngắn có từ khoá; >= 3 heading H2/H3; từ khoá xuất hiện trong >= 1 heading và trong 100 từ đầu;
độ dài >= 800 từ; >= 2 internal link; có >= 1 outbound link ra nguồn ngoài uy tín có thật;
có ảnh kèm alt; đoạn văn trung bình <= 80 từ; mật độ từ khoá <= 3.5%.
AEO - đoạn đầu tiên trả lời thẳng câu hỏi trong 40-360 ký tự và chứa từ khoá; có ít nhất một đoạn
dài 35-65 từ để làm featured snippet; >= 2 heading dạng câu hỏi; có mục FAQ; có câu định nghĩa
"X là ..."; có list hoặc bảng; có >= 3 bước đánh số nếu chủ đề cho phép; có khối tóm tắt/điểm chính.
GEO - đoạn mở đầu trích dẫn được; dẫn nguồn ngoài; có list/bảng; có mục FAQ; có >= 2 số liệu cụ thể;
có heading dạng câu hỏi; có tín hiệu cập nhật (năm hiện tại / "cập nhật"); >= 4 heading để phủ chủ đề.`;

function buildResearchPrompt(input: SrxWriteArticleInput): string {
  return `Lập bản nghiên cứu cho bài viết tiếng Việt.
Chủ đề/tiêu đề: ${input.title?.trim() || input.brief?.trim() || "(chưa có, tự xác định từ từ khoá)"}
Từ khoá mục tiêu: ${input.targetKeyword?.trim() || "(chưa có, tự chọn)"}
${input.categoryName ? `Chuyên mục: ${input.categoryName}` : ""}

Liệt kê ngắn gọn:
- Định nghĩa thực thể chính (X là gì) - chính xác.
- 5-8 ý/sub-topic quan trọng cần bao phủ.
- Câu hỏi người dùng hay hỏi (cho FAQ).
- Khái niệm/số liệu cần kiểm chứng (đánh dấu [cần kiểm chứng], KHÔNG bịa con số).
- Loại nguồn uy tín nên dẫn (tên nguồn/loại trang, không bịa URL).
- Lỗi/hiểu nhầm phổ biến cần tránh.`;
}

function buildWritePrompt(input: SrxWriteArticleInput, research?: string): string {
  const links = input.internalLinks ?? [];
  const internalBlock = links.length
    ? `LIÊN KẾT NỘI BỘ - chèn tự nhiên, chính xác các link sau vào thân bài (đúng cú pháp Markdown, giữ nguyên URL), mỗi link đúng 1 lần. KHÔNG thêm internal link nào khác:
${links.map((link) => `- [${link.anchor}](${link.url})`).join("\n")}`
    : "LIÊN KẾT NỘI BỘ: (không có bài nội bộ nào để liên kết) → chỉ dùng outbound link ra nguồn ngoài uy tín có thật.";

  const researchBlock = research?.trim()
    ? `TƯ LIỆU NGHIÊN CỨU (bám sát, KHÔNG bịa ngoài tư liệu; nếu thiếu thì nói chung chung thay vì bịa số liệu):
"""
${research.trim().slice(0, 4000)}
"""`
    : "";

  const titleLine = input.title?.trim()
    ? `Tiêu đề: ${input.title.trim()}`
    : "Tiêu đề: (CHƯA CÓ - TỰ ĐẶT một tiêu đề chuẩn SEO, hấp dẫn, <= 60 ký tự. KHÔNG chép nguyên văn câu yêu cầu thành tiêu đề.)";

  const keywordLine = input.targetKeyword?.trim()
    ? `Từ khoá mục tiêu: ${input.targetKeyword.trim()}`
    : "Từ khoá mục tiêu: (CHƯA CÓ - TỰ CHỌN 1 cụm 2-4 từ, ngắn gọn, đúng chủ đề bài.)";

  return `Viết một bài viết hoàn chỉnh bằng tiếng Việt.

${titleLine}
${keywordLine}
Từ khoá phụ: ${input.secondaryKeywords?.join(", ") || "(không có)"}
Dàn ý (H2/H3): ${input.outline?.join(" | ") || "(tự đề xuất)"}
${input.brief?.trim() ? `Yêu cầu của người dùng: ${input.brief.trim()}` : ""}
${input.audience?.trim() ? `Đối tượng đọc: ${input.audience.trim()}` : ""}
${input.tone?.trim() ? `Giọng văn: ${input.tone.trim()}` : ""}
${input.categoryName?.trim() ? `Chuyên mục: ${input.categoryName.trim()}` : ""}

${researchBlock}

${internalBlock}

${SCORING_RUBRIC}

Trả về JSON theo schema:
{
  "title": string,            // <= 60 ký tự
  "metaDescription": string,  // 120-155 ký tự
  "slug": string,             // ngắn, có từ khoá, dùng gạch nối
  "markdown": string,         // thân bài Markdown (xem BẮT BUỘC về đoạn mở đầu bên dưới)
  "faq": [{ "q": string, "a": string }],
  "tags": string[],           // 3-6 thẻ ngắn (1-3 từ), viết thường
  "seoNotes": string
}

BẮT BUỘC về đoạn mở đầu của "markdown" (đây là 2 tiêu chí có trọng số cao nhất, đừng bỏ qua):
- Đoạn đầu tiên phải là CÂU TRẢ LỜI TRỰC TIẾP cho đúng câu hỏi mà từ khoá đặt ra, đặt NGAY trước
  mọi heading, không mở bài vòng vo, không "Trong bài viết này chúng ta sẽ...".
- Đoạn đó dài 40-320 ký tự (khoảng 2-3 câu) và PHẢI chứa nguyên văn cụm từ khoá mục tiêu.
- Đứng một mình vẫn đủ nghĩa để engine trích nguyên đoạn làm câu trả lời.
- Sau đoạn đó mới đến các heading H2/H3, trong đó có ít nhất 2 heading là câu hỏi.`;
}

function extractJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Model đôi khi kèm lời dẫn — lấy khối { ... } dài nhất.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("Model không trả về JSON hợp lệ");
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Nối phần FAQ vào cuối thân bài để bài đạt tiêu chí FAQ của AEO/GEO. */
function appendFaq(markdown: string, faq: Array<{ q: string; a: string }>): string {
  if (faq.length === 0 || /(^|\n)#{2,3}\s*(faq|câu hỏi thường gặp)/i.test(markdown)) {
    return markdown;
  }

  const block = faq.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n");

  return `${markdown.trim()}\n\n## Câu hỏi thường gặp (FAQ)\n\n${block}\n`;
}

export async function writeSrxNewsArticle(input: SrxWriteArticleInput): Promise<SrxWrittenArticle> {
  // Bước 1: nghiên cứu. Lỗi ở bước này không chặn việc viết, chỉ ghi log.
  let research: string | undefined;

  try {
    const result = await srxAiComplete(
      { system: RESEARCH_SYSTEM, prompt: buildResearchPrompt(input), maxTokens: 1200 },
      { provider: input.provider, model: input.model },
    );
    research = result.text.trim() || undefined;
  } catch (error) {
    console.error("[writeSrxNewsArticle] bước nghiên cứu lỗi, viết không có tư liệu:", error);
  }

  // Bước 2: viết bài. Thử tối đa 2 lần, lần 2 ép JSON thuần.
  const basePrompt = buildWritePrompt(input, research);
  const strict =
    '\n\nQUAN TRỌNG: CHỈ trả về một object JSON hợp lệ, bắt đầu bằng "{" và kết thúc bằng "}". Không kèm markdown fence, không lời dẫn.';
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await srxAiComplete(
        {
          system: WRITER_SYSTEM,
          prompt: attempt === 0 ? basePrompt : basePrompt + strict,
          maxTokens: 16000,
          json: true,
        },
        { provider: input.provider, model: input.model },
      );

      const parsed = extractJson(result.text) as Record<string, unknown>;
      const title = String(parsed.title ?? input.title ?? "").trim();
      const faq = Array.isArray(parsed.faq)
        ? (parsed.faq as Array<Record<string, unknown>>)
            .map((item) => ({ q: String(item.q ?? "").trim(), a: String(item.a ?? "").trim() }))
            .filter((item) => item.q && item.a)
        : [];
      const markdown = appendFaq(String(parsed.markdown ?? "").trim(), faq);
      const metaDescription = String(parsed.metaDescription ?? "").trim();
      const slug = slugify(String(parsed.slug ?? title));

      if (!markdown) {
        throw new Error("Model trả về bài rỗng");
      }

      const report = scoreSrxArticle({
        title,
        content: markdown,
        contentIsMarkdown: true,
        excerpt: metaDescription,
        slug,
        targetKeyword: input.targetKeyword,
      });

      return {
        title,
        metaDescription,
        slug,
        markdown,
        html: srxMarkdownToHtml(markdown),
        faq,
        tags: asStringArray(parsed.tags),
        seoNotes: String(parsed.seoNotes ?? "").trim(),
        targetKeyword: input.targetKeyword ?? "",
        provider: result.provider,
        model: result.model,
        report,
        research,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Không sinh được bài viết");
}

/**
 * Markdown → HTML đủ dùng cho CKEditor. Chỉ hỗ trợ tập cú pháp mà prompt yêu cầu:
 * heading, đoạn, list, bảng, blockquote, link, ảnh, in đậm/nghiêng.
 */
export function srxMarkdownToHtml(markdown: string): string {
  const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (value: string) =>
    escapeHtml(value)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(" ").trim())}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length === 0) {
      return;
    }

    // Bỏ dòng phân cách |---|---| nếu có.
    const rows = tableRows.filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell.trim())));
    const [head, ...body] = rows;
    const headHtml = head ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` : "";
    const bodyHtml = body.length
      ? `<tbody>${body.map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`
      : "";

    html.push(`<figure class="table"><table>${headHtml}${bodyHtml}</table></figure>`);
    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph();
      flushList();
      tableRows.push(
        line
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|"),
      );
      continue;
    }

    flushTable();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);

    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 6);
      html.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);

    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${inline(quote[1])}</p></blockquote>`);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (bullet || ordered) {
      flushParagraph();
      const wanted = bullet ? "ul" : "ol";

      if (listType !== wanted) {
        flushList();
        html.push(`<${wanted}>`);
        listType = wanted;
      }

      html.push(`<li>${inline((bullet ?? ordered)![1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushTable();
  flushParagraph();
  flushList();

  return html.join("\n");
}
