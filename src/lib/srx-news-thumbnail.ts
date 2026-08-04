/* eslint-disable complexity -- chuỗi chọn nhà cung cấp/model là các nhánh phẳng theo từng API. */
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { convertImageBufferToWebp } from "@/lib/image-to-webp";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";
import { getSrxAiDefaultImageModel, type SrxAiImageProviderId } from "@/lib/srx-ai-models.shared";
import { srxAiComplete } from "@/lib/srx-ai-provider";
import { recordSrxAiUsage } from "@/lib/srx-ai-usage";
import { getSrxConnectionSecret } from "@/lib/srx-connections";

export type SrxThumbnailSize = "1024x1024" | "1536x1024" | "1024x1536";

export type SrxThumbnailInput = {
  title: string;
  /** Nội dung bài (HTML hoặc markdown) để AI hiểu và vẽ đúng chủ đề. */
  content?: string;
  excerpt?: string;
  /** Mô tả người dùng muốn ảnh trông thế nào — ưu tiên cao nhất. */
  userBrief?: string;
  size?: SrxThumbnailSize;
  /** Bỏ qua bước AI mô tả cảnh (nhanh hơn, nhưng ảnh bám nội dung kém hơn). */
  skipSceneBrief?: boolean;
  /** Bỏ trống = tự chọn nhà cung cấp nào đang có API key (OpenAI trước, Gemini sau). */
  provider?: SrxAiImageProviderId;
  /** Bỏ trống = model mặc định của nhà cung cấp đó. */
  model?: string;
};

export type SrxThumbnailResult = {
  url: string;
  alt: string;
  prompt: string;
  provider: "chatgpt" | "gemini";
  model: string;
  sceneBrief?: string;
};

/**
 * Ảnh AI hay chèn chữ méo mó, nhất là tiếng Việt có dấu. Luật này bắt buộc mọi
 * prompt tạo ảnh phải kèm để ảnh sạch chữ, dùng làm thumbnail được ngay.
 */
const NO_TEXT_RULES = `STRICT: absolutely NO text, letters, words, numbers, captions, watermarks, logos,
signage or UI elements anywhere in the image. No lettering of any kind. Purely visual composition.`;

const STYLE_GUIDANCE = `Style: clean, modern editorial photography for a Vietnamese skincare and beauty brand.
Soft natural lighting, shallow depth of field, calm and premium mood, uncluttered composition with
generous negative space so the image works as a blog cover. Realistic, not illustration, not 3D render.`;

const SCENE_SYSTEM = `Bạn là art director. Đọc bài viết và mô tả MỘT cảnh ảnh bìa phù hợp.
Trả lời bằng tiếng Anh, 1-2 câu, chỉ mô tả những gì NHÌN THẤY được (chủ thể, bối cảnh, ánh sáng, bố cục).
Không đề cập chữ viết, logo hay thương hiệu. Không giải thích thêm.`;

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bước 1: để model đọc bài và mô tả cảnh, ảnh sẽ bám nội dung thay vì chung chung. */
async function describeScene(input: SrxThumbnailInput): Promise<string | undefined> {
  if (input.skipSceneBrief) {
    return undefined;
  }

  const body = stripHtml(input.content ?? "").slice(0, 2000);

  try {
    const result = await srxAiComplete(
      {
        system: SCENE_SYSTEM,
        prompt: `Tiêu đề: ${input.title}\n${input.excerpt ? `Tóm tắt: ${input.excerpt}\n` : ""}${body ? `Nội dung: ${body}` : ""}`,
        maxTokens: 200,
      },
      // Mô tả cảnh là tác vụ text: ưu tiên đúng nhà cung cấp người dùng đã chọn để vẽ.
      { provider: input.provider },
    );

    return result.text.trim() || undefined;
  } catch (error) {
    console.error("[srx-news-thumbnail] không mô tả được cảnh, dùng prompt từ tiêu đề:", error);
    return undefined;
  }
}

export function buildSrxCoverPrompt(input: SrxThumbnailInput, sceneBrief?: string): string {
  const topic = [input.excerpt, stripHtml(input.content ?? "")].filter(Boolean).join(" - ").slice(0, 500);

  const subject = sceneBrief?.trim()
    ? `SCENE TO DEPICT (must match the article's content): ${sceneBrief.trim()}.`
    : `A scene that visually represents the topic of this article: "${input.title}".${topic ? ` Depict concepts from: ${topic}.` : ""}`;

  const userWish = input.userBrief?.trim()
    ? `USER REQUEST (HIGHEST priority — the image MUST follow this): ${input.userBrief.trim()}.`
    : "";

  return [userWish, subject, STYLE_GUIDANCE, NO_TEXT_RULES].filter(Boolean).join("\n\n");
}

async function generateWithOpenAi(
  apiKey: string,
  prompt: string,
  size: SrxThumbnailSize,
  model: string,
): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI image ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const b64 = result.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI không trả về ảnh");
  }

  await recordSrxAiUsage({
    provider: "openai",
    model,
    inputTokens: result.usage?.input_tokens,
    outputTokens: result.usage?.output_tokens,
  });

  return Buffer.from(b64, "base64");
}

/**
 * Google đổi tên model ảnh khá thường xuyên và mỗi API key lại được bật model khác
 * nhau, nên cho phép chỉ định qua biến môi trường thay vì phải sửa code.
 */
const GEMINI_IMAGE_MODEL = process.env.SRX_GEMINI_IMAGE_MODEL?.trim() ?? getSrxAiDefaultImageModel("gemini");

async function generateWithGemini(apiKey: string, prompt: string, model: string): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini image ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };

  const data = result.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;

  if (!data) {
    throw new Error("Gemini không trả về ảnh");
  }

  return Buffer.from(data, "base64");
}

/** Lưu ảnh vào public/upload/ports dưới dạng webp và trả về URL công khai. */
async function saveThumbnail(buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "upload", "ports");
  await mkdir(uploadDir, { recursive: true });

  const converted = await convertImageBufferToWebp(buffer, { filename: "thumbnail.png", mimeType: "image/png" });
  const filename = `${Date.now()}-${randomUUID()}${converted.extension}`;

  await writeFile(path.join(uploadDir, filename), converted.buffer);

  return resolveSiteAssetUrl(`/upload/ports/${filename}`);
}

/**
 * Người dùng chọn nhà cung cấp thì chỉ chạy đúng nhà đó (và báo lỗi thật nếu hỏng);
 * bỏ trống thì thử OpenAI trước rồi rơi sang Gemini.
 */
function resolveImageTarget(
  input: SrxThumbnailInput,
  keys: { hasOpenAiKey: boolean; hasGeminiKey: boolean },
): { useOpenAi: boolean; useGemini: boolean; openAiModel: string; geminiModel: string } {
  if (input.provider === "chatgpt" && !keys.hasOpenAiKey) {
    throw new Error("Chưa có API key OpenAI — cấu hình ở trang Quản lý kết nối");
  }

  if (input.provider === "gemini" && !keys.hasGeminiKey) {
    throw new Error("Chưa có API key Gemini — cấu hình ở trang Quản lý kết nối");
  }

  const chosenModel = input.model?.trim() ?? "";

  return {
    useOpenAi: input.provider ? input.provider === "chatgpt" : true,
    useGemini: input.provider ? input.provider === "gemini" : true,
    openAiModel: input.provider === "chatgpt" && chosenModel ? chosenModel : getSrxAiDefaultImageModel("chatgpt"),
    geminiModel: input.provider === "gemini" && chosenModel ? chosenModel : GEMINI_IMAGE_MODEL,
  };
}

export async function generateSrxThumbnail(input: SrxThumbnailInput): Promise<SrxThumbnailResult> {
  const sceneBrief = await describeScene(input);
  const prompt = buildSrxCoverPrompt(input, sceneBrief);
  const size = input.size ?? "1536x1024";

  const [openAiKey, geminiKey] = await Promise.all([
    getSrxConnectionSecret("chatgpt"),
    getSrxConnectionSecret("gemini"),
  ]);

  if (!openAiKey && !geminiKey) {
    throw new Error("Cần API key OpenAI hoặc Gemini để tạo ảnh — cấu hình ở trang Quản lý kết nối");
  }

  const { useOpenAi, useGemini, openAiModel, geminiModel } = resolveImageTarget(input, {
    hasOpenAiKey: Boolean(openAiKey),
    hasGeminiKey: Boolean(geminiKey),
  });
  const errors: string[] = [];

  if (useOpenAi && openAiKey) {
    try {
      const buffer = await generateWithOpenAi(openAiKey, prompt, size, openAiModel);

      return {
        url: await saveThumbnail(buffer),
        alt: input.title,
        prompt,
        provider: "chatgpt",
        model: openAiModel,
        sceneBrief,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      console.error("[srx-news-thumbnail] OpenAI lỗi:", message);
    }
  }

  if (useGemini && geminiKey) {
    try {
      const buffer = await generateWithGemini(geminiKey, prompt, geminiModel);

      return {
        url: await saveThumbnail(buffer),
        alt: input.title,
        prompt,
        provider: "gemini",
        model: geminiModel,
        sceneBrief,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Không tạo được ảnh. ${errors.join(" | ")}`);
}
