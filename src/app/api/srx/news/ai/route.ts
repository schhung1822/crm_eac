import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import {
  generateSrxNewsArticleDraft,
  generateSrxNewsImage,
  improveSrxNewsArticle,
  scoreSrxNewsArticle,
} from "@/lib/srx-news-ai";
import { generateSrxThumbnail } from "@/lib/srx-news-thumbnail";
import { writeSrxNewsArticle } from "@/lib/srx-news-writer";

const scoreSchema = z.object({
  aeo: z.number().optional().default(0),
  geo: z.number().optional().default(0),
  overall: z.number().optional().default(0),
  seo: z.number().optional().default(0),
  strengths: z.array(z.string()).optional().default([]),
  suggestions: z.array(z.string()).optional().default([]),
});

const modelPreferenceSchema = z.object({
  modelId: z.string().optional().default(""),
  provider: z.enum(["fallback", "gemini", "openai"]).optional(),
});

const articleInputSchema = z.object({
  audience: z.string().optional().default(""),
  categoryName: z.string().optional().default(""),
  content: z.string().optional().default(""),
  contentGoal: z.string().optional().default(""),
  excerpt: z.string().optional().default(""),
  keywords: z.string().optional().default(""),
  title: z.string().optional().default(""),
  tone: z.string().optional().default(""),
  topic: z.string().optional().default(""),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-content"),
    input: articleInputSchema,
    modelPreference: modelPreferenceSchema.optional(),
  }),
  z.object({
    action: z.literal("score"),
    input: articleInputSchema,
    modelPreference: modelPreferenceSchema.optional(),
  }),
  z.object({
    action: z.literal("improve"),
    input: articleInputSchema,
    modelPreference: modelPreferenceSchema.optional(),
    score: scoreSchema.optional(),
  }),
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
      provider: z.enum(["claude", "chatgpt", "gemini", "deepseek"]).optional(),
      model: z.string().optional(),
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
    }),
  }),
  z.object({
    action: z.literal("generate-image"),
    input: articleInputSchema.extend({
      imageContext: z.string().optional().default(""),
      modelPreference: modelPreferenceSchema.optional(),
      placement: z.enum(["inline", "thumbnail"]).optional().default("thumbnail"),
      prompt: z.string().optional().default(""),
      textModelPreference: modelPreferenceSchema.optional(),
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

    if (payload.action === "generate-content") {
      const draft = await generateSrxNewsArticleDraft(payload.input, payload.modelPreference);
      return NextResponse.json({ draft });
    }

    if (payload.action === "write-article") {
      const article = await writeSrxNewsArticle(payload.input);
      return NextResponse.json({ article });
    }

    if (payload.action === "generate-thumbnail") {
      const thumbnail = await generateSrxThumbnail(payload.input);
      return NextResponse.json({ thumbnail });
    }

    if (payload.action === "score") {
      const score = scoreSrxNewsArticle(payload.input);
      return NextResponse.json({ score });
    }

    if (payload.action === "improve") {
      const draft = await improveSrxNewsArticle(payload.input, payload.score, payload.modelPreference);
      const score = scoreSrxNewsArticle({ ...payload.input, ...draft });
      return NextResponse.json({ draft, score });
    }

    const image = await generateSrxNewsImage(payload.input);
    return NextResponse.json({ image });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xử lý tác vụ AI cho tin tức");
  }
}
