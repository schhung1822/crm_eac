/* eslint-disable complexity, max-lines, @typescript-eslint/prefer-nullish-coalescing -- prompt và biến môi trường ghép từ nhiều nguồn tuỳ chọn: chuỗi rỗng PHẢI rơi về giá trị kế tiếp nên dùng "||"; đổi sang "??" sẽ giữ lại chuỗi rỗng và làm hỏng cấu hình. */
import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveSiteAssetUrl } from "@/lib/site-asset-url";
import { readSrxAiSettings, resolveConfiguredModel } from "@/lib/srx-ai-settings";
import { recordSrxAiUsage } from "@/lib/srx-ai-usage";
import { scoreSrxArticle, type SrxScoreCheck } from "@/lib/srx-article-scoring";

export type SrxNewsAiArticleInput = {
  audience?: string;
  categoryName?: string;
  content: string;
  contentGoal?: string;
  excerpt: string;
  keywords?: string;
  title: string;
  tone?: string;
  topic?: string;
};

export type SrxNewsAiArticleDraft = {
  content: string;
  excerpt: string;
  imagePrompt: string;
  seoKeywords: string[];
  slug: string;
  thumbnailPrompt: string;
  title: string;
};

export type SrxNewsAiScore = {
  aeo: number;
  geo: number;
  overall: number;
  seo: number;
  strengths: string[];
  suggestions: string[];
  /** Chi tiết từng tiêu chí, để editor hiển thị checklist thay vì chỉ con số. */
  checks?: {
    seo: SrxScoreCheck[];
    aeo: SrxScoreCheck[];
    geo: SrxScoreCheck[];
  };
};

export type SrxNewsAiImageResult = {
  alt: string;
  caption: string;
  prompt: string;
  url: string;
};

type SrxNewsAiImageBrief = {
  alt: string;
  caption: string;
  prompt: string;
};

export type SrxNewsAiModelPreference = {
  modelId?: string;
  provider?: "fallback" | "gemini" | "openai";
};

type ChatMessage = {
  content: string;
  role: "system" | "user";
};

const SRX_BRAND_CONTEXT = `SRX is a professional skincare and aesthetic brand. Visual style: clean clinical luxury, white and soft neutral background, emerald/teal accents, premium Korean beauty lab mood, scientific skin regeneration, elegant product placement, realistic skincare bottle/ampoule/mask packaging when relevant, no medical gore, no exaggerated claims.`;
const DEFAULT_TEXT_MODEL = process.env.SRX_AI_TEXT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL =
  process.env.SRX_AI_GEMINI_TEXT_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-1.5-flash";
const DEFAULT_IMAGE_MODEL = process.env.SRX_AI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseJsonObject<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = /\{[\s\S]*\}/.exec(value);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function getKeywordList(input: SrxNewsAiArticleInput): string[] {
  return String(input.keywords || "")
    .split(/[;,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildFallbackDraft(input: SrxNewsAiArticleInput): SrxNewsAiArticleDraft {
  const topic = input.topic?.trim() || input.title?.trim() || "Giải pháp chăm sóc da chuyên sâu từ SRX";
  const keywords = getKeywordList(input);
  const keywordText = keywords.length ? keywords.join(", ") : "SRX, phục hồi da, chăm sóc da chuyên sâu";
  const title = input.title?.trim() || `${topic}: Góc nhìn chuyên sâu từ SRX`;
  const excerpt =
    input.excerpt?.trim() ||
    `Bài viết phân tích ${topic.toLowerCase()} theo góc nhìn khoa học, ứng dụng thực tế và định hướng chăm sóc da chuyên nghiệp của SRX.`;

  return {
    title,
    slug: slugify(title),
    excerpt,
    seoKeywords: keywords.length ? keywords : ["SRX", "phục hồi da", "chăm sóc da chuyên sâu"],
    imagePrompt: buildImagePrompt({ ...input, title }, "inline"),
    thumbnailPrompt: buildImagePrompt({ ...input, title }, "thumbnail"),
    content: `<h2>${topic}</h2><p>${excerpt}</p><h3>Vì sao chủ đề này quan trọng?</h3><p>Trong chăm sóc da chuyên nghiệp, việc hiểu đúng nền tảng khoa học giúp lựa chọn liệu trình và sản phẩm phù hợp hơn với từng tình trạng da.</p><h3>Góc nhìn từ SRX</h3><p>SRX tập trung vào tính an toàn, khả năng phục hồi hàng rào bảo vệ da và trải nghiệm điều trị có cơ sở. Nội dung nên nhấn mạnh bằng chứng, quy trình và lợi ích thực tế cho người dùng.</p><h3>Gợi ý ứng dụng</h3><ul><li>Xác định nhu cầu da trước khi chọn sản phẩm hoặc liệu trình.</li><li>Kết hợp chăm sóc tại nhà với hướng dẫn từ chuyên viên.</li><li>Theo dõi phản ứng da và điều chỉnh theo từng giai đoạn.</li></ul><p><strong>Từ khóa trọng tâm:</strong> ${keywordText}.</p>`,
  };
}

function buildArticlePrompt(input: SrxNewsAiArticleInput): string {
  const keywords = getKeywordList(input);
  const existingContent = stripHtml(input.content).slice(0, 2600);

  return `Write a complete Vietnamese SRX news article draft. Return JSON only with keys: title, slug, excerpt, content, seoKeywords, imagePrompt, thumbnailPrompt.

Brand context: ${SRX_BRAND_CONTEXT}
Category: ${input.categoryName || "Tin tức SRX"}
Topic / brief: ${input.topic || input.title || "SRX skincare news"}
Content goal: ${input.contentGoal || "Bài tư vấn chuyên sâu, dễ hiểu, tối ưu SEO/GEO/AEO"}
Target audience: ${input.audience || "khách hàng quan tâm chăm sóc da, spa/clinic, đại lý và người dùng SRX"}
Keywords: ${keywords.length ? keywords.join(", ") : input.keywords || "SRX, chăm sóc da, phục hồi da"}
Tone: ${input.tone || "chuyên nghiệp, khoa học, dễ hiểu"}
Current title: ${input.title || ""}
Current excerpt: ${input.excerpt || ""}
Current content to preserve if useful: ${existingContent}

Output requirements:
- Vietnamese only, natural editorial voice, no markdown fences.
- Title: compelling, 45-75 characters, contains the main topic naturally.
- Excerpt: 130-165 characters, clear benefit, includes the main keyword if natural.
- Content HTML only: use h2, h3, p, ul, li, strong when useful.
- 900-1400 words when enough context is available.
- Structure: short lead paragraph, problem/context, science/mechanism, SRX perspective, practical application, cautions, FAQ, concise conclusion.
- Add 4-6 FAQ questions optimized for AEO with direct answers.
- Optimize GEO: include definition-style explanations, entity names, clear topical headings, and concise answer blocks.
- Use keywords naturally; avoid keyword stuffing.
- Mention SRX naturally as brand perspective, not as hard selling.
- Avoid unsupported medical claims, disease treatment claims, before-after promises, or absolute guarantees.
- If current content exists, improve and expand it instead of discarding useful facts.
- seoKeywords: 6-10 Vietnamese keyword phrases.
- imagePrompt and thumbnailPrompt: English prompts for a real AI image model, specific to this article, SRX clinical luxury style, no text overlays.`;
}

function buildImprovePrompt(input: SrxNewsAiArticleInput, score: SrxNewsAiScore): string {
  return `Improve this Vietnamese SRX article to increase SEO, GEO and AEO scores. Return JSON only with keys: title, slug, excerpt, content, seoKeywords, imagePrompt, thumbnailPrompt.

Brand context: ${SRX_BRAND_CONTEXT}
Content goal: ${input.contentGoal || "Tối ưu nội dung chuyên sâu"}
Target audience: ${input.audience || "khách hàng SRX, spa/clinic, đại lý"}
Current score: SEO ${score.seo}, GEO ${score.geo}, AEO ${score.aeo}, overall ${score.overall}
Suggestions: ${score.suggestions.join("; ")}
Keywords: ${input.keywords || ""}
Title: ${input.title}
Excerpt: ${input.excerpt}
HTML content: ${input.content}

Rules:
- Keep useful facts and the original topic.
- Strengthen headings, intro, conclusion, FAQ and direct answer sections.
- Improve title/excerpt for click clarity and SEO length.
- Add missing context, mechanism, application guidance and cautions.
- Preserve brand safety; avoid unsupported medical claims.
- Return valid JSON only, content as clean semantic HTML.`;
}

function getArticleVisualContext(
  input: SrxNewsAiArticleInput,
  placement: "inline" | "thumbnail",
  imageContext?: string,
): string {
  const plainContent = stripHtml(input.content);
  const explicitContext = imageContext?.trim();

  if (explicitContext) return explicitContext.slice(0, 1600);
  if (placement === "inline") return plainContent.slice(0, 1800);

  return [input.title, input.excerpt, plainContent.slice(0, 2400)].filter(Boolean).join("\n");
}

function buildImagePrompt(
  input: SrxNewsAiArticleInput,
  placement: "inline" | "thumbnail",
  imageContext?: string,
): string {
  const topic = input.topic || input.title || "SRX skincare science";
  const context = getArticleVisualContext(input, placement, imageContext);
  const format =
    placement === "thumbnail"
      ? "square 1:1 editorial thumbnail, strong single focal subject, suitable for news listing and social preview"
      : "wide editorial article image, natural in-content visual, documentary product/lab composition";

  return `${format}. ${SRX_BRAND_CONTEXT} Article topic: ${topic}. Content context to visualize: ${context}. Create a specific scene that matches the article content, include elegant SRX skincare product packaging or ampoule when relevant, premium clinical beauty lighting, clean Vietnamese/Korean aesthetic, no readable fake text, no distorted hands, no before-after medical claims.`;
}

function buildImageBriefPrompt(
  input: SrxNewsAiArticleInput,
  placement: "inline" | "thumbnail",
  imageContext?: string,
): string {
  const context = getArticleVisualContext(input, placement, imageContext);
  const target =
    placement === "thumbnail"
      ? "a thumbnail that summarizes the whole article and works as the main featured image"
      : "an image that illustrates the provided paragraph/section and can be inserted inside the article";

  return `Create an image generation brief for ${target}. Return JSON only with keys: prompt, alt, caption.

Brand context: ${SRX_BRAND_CONTEXT}
Article title: ${input.title || input.topic || "SRX news"}
Excerpt: ${input.excerpt || ""}
Keywords: ${input.keywords || ""}
Category: ${input.categoryName || "SRX News"}
Content context: ${context}

Rules:
- prompt must be in English and directly describe the concrete scene/content, not generic branding.
- Include SRX product packaging, ampoule, mask, lab material, event booth or skincare professional only when relevant to the context.
- Avoid text overlays, fake logos, before-after medical claims, needles, wounds, exaggerated skin results.
- Keep SRX clinical luxury style: clean, premium, Korean skincare science, emerald/teal accents.
- alt and caption must be concise Vietnamese.`;
}

function normalizeImageBrief(value: Partial<SrxNewsAiImageBrief> | null, fallbackPrompt: string): SrxNewsAiImageBrief {
  return {
    alt: String(value?.alt || "Hình minh họa theo phong cách SRX").trim(),
    caption: String(value?.caption || "Hình minh họa theo phong cách SRX.").trim(),
    prompt: String(value?.prompt || fallbackPrompt).trim(),
  };
}

async function buildContextualImageBrief(
  input: SrxNewsAiArticleInput,
  placement: "inline" | "thumbnail",
  imageContext?: string,
  preference?: SrxNewsAiModelPreference,
): Promise<SrxNewsAiImageBrief> {
  const fallbackPrompt = buildImagePrompt(input, placement, imageContext);
  const result = await callTextJson<Partial<SrxNewsAiImageBrief>>(
    buildImageBriefPrompt(input, placement, imageContext),
    preference?.provider === "fallback" ? undefined : preference,
  );

  return normalizeImageBrief(result, fallbackPrompt);
}

function shouldUseProvider(preference: SrxNewsAiModelPreference | undefined, provider: "gemini" | "openai"): boolean {
  return !preference?.provider || preference.provider === provider;
}

async function callOpenAiText(messages: ChatMessage[], preference?: SrxNewsAiModelPreference): Promise<string | null> {
  if (!shouldUseProvider(preference, "openai")) return null;

  const settings = await readSrxAiSettings();
  const provider = settings.openai;
  const apiKey = provider.enabled
    ? provider.apiKey.trim() || process.env.OPENAI_API_KEY?.trim()
    : process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) return null;

  const model = provider.enabled
    ? resolveConfiguredModel("openai", preference?.modelId || provider.defaultModelId)
    : preference?.modelId || DEFAULT_TEXT_MODEL;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(await readProviderError(response, "OpenAI"));
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  await recordSrxAiUsage({
    provider: "openai",
    model,
    inputTokens: result.usage?.prompt_tokens,
    outputTokens: result.usage?.completion_tokens,
  });

  return result.choices?.[0]?.message?.content ?? null;
}

async function callGeminiText(prompt: string, preference?: SrxNewsAiModelPreference): Promise<string | null> {
  if (!shouldUseProvider(preference, "gemini")) return null;

  const settings = await readSrxAiSettings();
  const provider = settings.gemini;
  const apiKey = provider.enabled
    ? provider.apiKey.trim() || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
    : process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) return null;

  const model = provider.enabled
    ? resolveConfiguredModel("gemini", preference?.modelId || provider.defaultModelId)
    : preference?.modelId || DEFAULT_GEMINI_MODEL;

  const response = await fetch(
    `${provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.45,
        },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readProviderError(response, "Gemini"));
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  await recordSrxAiUsage({
    provider: "gemini",
    model,
    inputTokens: result.usageMetadata?.promptTokenCount,
    outputTokens: result.usageMetadata?.candidatesTokenCount,
  });

  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || null;
}

async function callTextJson<T>(prompt: string, preference?: SrxNewsAiModelPreference): Promise<T | null> {
  if (preference?.provider === "fallback") return null;

  const system = "You are an expert Vietnamese beauty, SEO, GEO and AEO editor for SRX. Return valid JSON only.";
  const explicitProvider = preference?.provider === "openai" || preference?.provider === "gemini";

  try {
    const openAiText = await callOpenAiText(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      preference,
    );
    const openAiJson = openAiText ? parseJsonObject<T>(openAiText) : null;

    if (openAiJson) return openAiJson;
  } catch (error) {
    console.warn("OpenAI text fallback:", error instanceof Error ? error.message : error);
    if (explicitProvider) throw error;
  }

  try {
    const geminiText = await callGeminiText(`${system}\n\n${prompt}`, preference);
    return geminiText ? parseJsonObject<T>(geminiText) : null;
  } catch (error) {
    console.warn("Gemini text fallback:", error instanceof Error ? error.message : error);
    if (explicitProvider) throw error;
    return null;
  }
}
function normalizeDraft(
  value: Partial<SrxNewsAiArticleDraft> | null,
  input: SrxNewsAiArticleInput,
): SrxNewsAiArticleDraft {
  const fallback = buildFallbackDraft(input);
  const title = String(value?.title || fallback.title).trim();

  return {
    title,
    slug: slugify(String(value?.slug || title || fallback.slug)) || fallback.slug,
    excerpt: String(value?.excerpt || fallback.excerpt).trim(),
    content: String(value?.content || fallback.content).trim(),
    seoKeywords:
      Array.isArray(value?.seoKeywords) && value.seoKeywords.length
        ? value.seoKeywords.map(String)
        : fallback.seoKeywords,
    imagePrompt: String(value?.imagePrompt || fallback.imagePrompt).trim(),
    thumbnailPrompt: String(value?.thumbnailPrompt || fallback.thumbnailPrompt).trim(),
  };
}

async function saveImageBuffer(buffer: Buffer, extension = ".png"): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "upload", "ports");

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return resolveSiteAssetUrl(`/upload/ports/${filename}`);
}

function translateProviderError(provider: string, status: number, message: string): string {
  const normalized = message.toLowerCase();

  if (
    status === 429 ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return `${provider}: Đã vượt giới hạn sử dụng hoặc hết quota cho model này. Vui lòng kiểm tra hạn mức, quota, billing hoặc thử model khác.`;
  }

  if (
    normalized.includes("billing") ||
    normalized.includes("payment") ||
    normalized.includes("paid") ||
    normalized.includes("insufficient_quota")
  ) {
    return `${provider}: Tài khoản/API key chưa bật thanh toán hoặc chưa có đủ credit để dùng model này. Vui lòng bật billing/nạp credit rồi thử lại.`;
  }

  if (status === 401 || normalized.includes("api key") || normalized.includes("invalid api")) {
    return `${provider}: API key không hợp lệ hoặc chưa được lưu đúng. Vui lòng kiểm tra lại khóa API trong mục Tích hợp AI.`;
  }

  if (
    status === 403 ||
    normalized.includes("permission") ||
    normalized.includes("not allowed") ||
    normalized.includes("access")
  ) {
    return `${provider}: API key chưa có quyền dùng model này. Vui lòng kiểm tra quyền truy cập model hoặc chọn model khác.`;
  }

  if (
    normalized.includes("model") &&
    (normalized.includes("not found") || normalized.includes("invalid") || normalized.includes("unsupported"))
  ) {
    return `${provider}: Model đã chọn không khả dụng với API key hiện tại. Vui lòng chọn model khác trong danh sách.`;
  }

  return `${provider} lỗi ${status}: ${message}`;
}

async function readProviderError(response: Response, provider: string): Promise<string> {
  const rawText = await response.text().catch(() => "");

  if (!rawText) return translateProviderError(provider, response.status, "Không có nội dung lỗi từ nhà cung cấp.");

  try {
    const parsed = JSON.parse(rawText) as { error?: { message?: string }; message?: string };
    const message = parsed.error?.message || parsed.message || rawText;
    return translateProviderError(provider, response.status, message);
  } catch {
    return translateProviderError(provider, response.status, rawText.slice(0, 500));
  }
}

async function generateOpenAiImage(prompt: string, preference?: SrxNewsAiModelPreference): Promise<string | null> {
  if (!shouldUseProvider(preference, "openai")) return null;

  const settings = await readSrxAiSettings();
  const provider = settings.openai;
  const apiKey = provider.enabled
    ? provider.apiKey.trim() || process.env.OPENAI_API_KEY?.trim()
    : process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) return null;

  const model = provider.enabled
    ? resolveConfiguredModel("openai", preference?.modelId || "gpt-image-2")
    : preference?.modelId || DEFAULT_IMAGE_MODEL;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(await readProviderError(response, "OpenAI image"));
  }

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  await recordSrxAiUsage({
    provider: "openai",
    model,
    inputTokens: result.usage?.input_tokens,
    outputTokens: result.usage?.output_tokens,
  });

  const image = result.data?.[0];

  if (image?.b64_json) {
    return saveImageBuffer(Buffer.from(image.b64_json, "base64"));
  }

  if (image?.url) {
    const imageResponse = await fetch(image.url);

    if (!imageResponse.ok) return image.url;

    return saveImageBuffer(Buffer.from(await imageResponse.arrayBuffer()));
  }

  return null;
}

async function generateGeminiImage(prompt: string, preference?: SrxNewsAiModelPreference): Promise<string | null> {
  if (!shouldUseProvider(preference, "gemini")) return null;

  const settings = await readSrxAiSettings();
  const provider = settings.gemini;
  const apiKey = provider.enabled
    ? provider.apiKey.trim() || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
    : process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) return null;

  const model = provider.enabled
    ? resolveConfiguredModel("gemini", preference?.modelId || "nano-banana-2-lite")
    : preference?.modelId || "gemini-3.1-flash-image";

  const response = await fetch(
    `${provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/interactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        input: prompt,
        model,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readProviderError(response, "Gemini image"));
  }

  const result = (await response.json()) as {
    output_image?: { data?: string; mime_type?: string };
  };
  const image = result.output_image;

  if (!image?.data) return null;

  const mimeType = image.mime_type || "image/png";
  const extension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? ".jpg" : ".png";

  return saveImageBuffer(Buffer.from(image.data, "base64"), extension);
}

export async function generateSrxNewsArticleDraft(
  input: SrxNewsAiArticleInput,
  preference?: SrxNewsAiModelPreference,
): Promise<SrxNewsAiArticleDraft> {
  const result = await callTextJson<Partial<SrxNewsAiArticleDraft>>(buildArticlePrompt(input), preference);
  return normalizeDraft(result, input);
}

/**
 * Chấm điểm bài viết bằng bộ tiêu chí SEO/AEO/GEO (port từ GEO-Report-AI).
 * Hoàn toàn bằng luật: chạy tức thì, không tốn token và cho kết quả nhất quán
 * giữa các màn hình. Không còn gọi AI cho việc chấm điểm.
 */
export function scoreSrxNewsArticle(input: SrxNewsAiArticleInput): SrxNewsAiScore {
  const report = scoreSrxArticle({
    title: input.title,
    content: input.content,
    excerpt: input.excerpt,
    targetKeyword: getKeywordList(input)[0],
  });

  return {
    seo: report.seo.score,
    aeo: report.aeo.score,
    geo: report.geo.score,
    overall: report.overall,
    strengths: report.strengths,
    suggestions: report.suggestions,
    checks: {
      seo: report.seo.checks,
      aeo: report.aeo.checks,
      geo: report.geo.checks,
    },
  };
}

export async function improveSrxNewsArticle(
  input: SrxNewsAiArticleInput,
  scoreOverride?: SrxNewsAiScore,
  preference?: SrxNewsAiModelPreference,
): Promise<SrxNewsAiArticleDraft> {
  const score = scoreOverride ?? scoreSrxNewsArticle(input);
  const result = await callTextJson<Partial<SrxNewsAiArticleDraft>>(buildImprovePrompt(input, score), preference);
  return normalizeDraft(result, input);
}

export async function generateSrxNewsImage(
  input: SrxNewsAiArticleInput & {
    imageContext?: string;
    modelPreference?: SrxNewsAiModelPreference;
    placement?: "inline" | "thumbnail";
    prompt?: string;
    textModelPreference?: SrxNewsAiModelPreference;
  },
): Promise<SrxNewsAiImageResult> {
  const placement = input.placement || "thumbnail";
  const brief = input.prompt?.trim()
    ? normalizeImageBrief({ prompt: input.prompt }, input.prompt)
    : await buildContextualImageBrief(input, placement, input.imageContext, input.textModelPreference);
  if (!input.modelPreference || input.modelPreference.provider === "fallback") {
    throw new Error("Please select a real AI image model before generating an image.");
  }

  let generatedUrl: string | null = null;

  try {
    generatedUrl =
      input.modelPreference.provider === "gemini"
        ? await generateGeminiImage(brief.prompt, input.modelPreference)
        : await generateOpenAiImage(brief.prompt, input.modelPreference);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "The selected AI model could not generate an image.");
  }

  if (!generatedUrl) {
    throw new Error(
      "The selected AI model did not return an image. Check the API key, image model access, or choose another image model.",
    );
  }

  return { ...brief, url: generatedUrl };
}
