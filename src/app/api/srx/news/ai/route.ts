import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { srxAiImageProviderIds, srxAiTextProviderIds } from "@/lib/srx-ai-models.shared";
import { scoreSrxArticle, summarizeSrxArticleReport } from "@/lib/srx-article-scoring";
import { generateSrxThumbnail } from "@/lib/srx-news-thumbnail";
import { writeSrxNewsArticle } from "@/lib/srx-news-writer";

const textProviderSchema = z.enum(srxAiTextProviderIds);
const imageProviderSchema = z.enum(srxAiImageProviderIds);

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("write-article"),
    input: z.object({
      title: z.string().optional().default(""),
      targetKeyword: z.string().optional().default(""),
      secondaryKeywords: z.array(z.string()).optional().default([]),
      outline: z.array(z.string()).optional().default([]),
      brief: z.string().optional().default(""),
      audience: z.string().optional().default(""),
      tone: z.string().optional().default(""),
      categoryName: z.string().optional().default(""),
      internalLinks: z
        .array(z.object({ anchor: z.string(), url: z.string() }))
        .optional()
        .default([]),
      provider: textProviderSchema.optional(),
      model: z.string().optional(),
      /** Có nội dung = tối ưu lại bài hiện tại thay vì viết mới. */
      currentContent: z.string().optional().default(""),
      improvements: z.array(z.string()).optional().default([]),
    }),
  }),
  z.object({
    action: z.literal("generate-thumbnail"),
    input: z.object({
      title: z.string().min(1),
      content: z.string().optional().default(""),
      excerpt: z.string().optional().default(""),
      userBrief: z.string().optional().default(""),
      size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).optional(),
      skipSceneBrief: z.boolean().optional(),
      provider: imageProviderSchema.optional(),
      model: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("score"),
    input: z.object({
      title: z.string().optional().default(""),
      content: z.string().optional().default(""),
      excerpt: z.string().optional().default(""),
      keywords: z.string().optional().default(""),
    }),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền dùng AI cho tin tức SRX");

    if (accessError) {
      return accessError;
    }

    const payload = requestSchema.parse(await request.json());

    if (payload.action === "write-article") {
      const article = await writeSrxNewsArticle(payload.input);
      return NextResponse.json({ article });
    }

    if (payload.action === "generate-thumbnail") {
      const thumbnail = await generateSrxThumbnail(payload.input);
      return NextResponse.json({ thumbnail });
    }

    const score = summarizeSrxArticleReport(
      scoreSrxArticle({
        title: payload.input.title,
        content: payload.input.content,
        excerpt: payload.input.excerpt,
        targetKeyword: payload.input.keywords.split(",")[0]?.trim(),
      }),
    );

    return NextResponse.json({ score });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xử lý tác vụ AI cho tin tức");
  }
}
