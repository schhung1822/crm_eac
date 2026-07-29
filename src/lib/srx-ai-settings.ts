import "server-only";

import { getSrxConnectionSecret, getSrxConnectionValues } from "@/lib/srx-connections";

export type SrxAiProvider = "gemini" | "openai";

export type SrxAiProviderConfig = {
  apiKey: string;
  baseUrl: string;
  defaultModelId: string;
  enabled: boolean;
  notes: string;
  projectId: string;
};

export type SrxAiSettings = Record<SrxAiProvider, SrxAiProviderConfig>;

export const defaultSrxAiSettings: SrxAiSettings = {
  openai: {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    defaultModelId: "gpt-5.6-luna",
    enabled: false,
    notes: "",
    projectId: "",
  },
  gemini: {
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModelId: "gemini-3.5-flash",
    enabled: true,
    notes: "",
    projectId: "",
  },
};

/**
 * Cấu hình AI giờ nằm trong store kết nối (/dashboard -> trang /ai).
 * Hàm này chỉ là lớp đọc để phần tin tức AI dùng lại như trước.
 */
export async function readSrxAiSettings(): Promise<SrxAiSettings> {
  const [openaiKey, openaiValues, geminiKey, geminiValues] = await Promise.all([
    getSrxConnectionSecret("chatgpt"),
    getSrxConnectionValues("chatgpt"),
    getSrxConnectionSecret("gemini"),
    getSrxConnectionValues("gemini"),
  ]);

  return {
    openai: {
      apiKey: openaiKey,
      baseUrl: openaiValues.baseUrl || defaultSrxAiSettings.openai.baseUrl,
      defaultModelId: openaiValues.model || defaultSrxAiSettings.openai.defaultModelId,
      enabled: Boolean(openaiKey),
      notes: "",
      projectId: openaiValues.projectId || "",
    },
    gemini: {
      apiKey: geminiKey,
      baseUrl: geminiValues.baseUrl || defaultSrxAiSettings.gemini.baseUrl,
      defaultModelId: geminiValues.model || defaultSrxAiSettings.gemini.defaultModelId,
      enabled: Boolean(geminiKey),
      notes: "",
      projectId: "",
    },
  };
}

export function resolveConfiguredModel(provider: SrxAiProvider, modelId: string): string {
  const normalizedModelId = modelId.trim();

  if (!normalizedModelId) {
    return defaultSrxAiSettings[provider].defaultModelId;
  }

  const fallbackMap: Record<string, string> = {
    "gpt-5.6-luna": "gpt-4o-mini",
    "gpt-5.6-sol": "gpt-4o",
    "gpt-5.6-terra": "gpt-4o-mini",
    "gpt-image-2": "gpt-image-1",
    "gpt-image-mini": "gpt-image-1-mini",
    "gemini-3.1-flash-lite": "gemini-1.5-flash-8b",
    "gemini-3.1-pro": "gemini-1.5-pro",
    "gemini-3.5-flash": "gemini-1.5-flash",
    "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
    "nano-banana-pro": "gemini-3-pro-image",
  };

  return fallbackMap[normalizedModelId] ?? normalizedModelId;
}
