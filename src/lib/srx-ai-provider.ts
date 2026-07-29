/* eslint-disable complexity -- các hàm gọi provider là chuỗi xử lý phẳng theo từng API. */
import "server-only";

import { recordSrxAiUsage, type SrxAiUsageProvider } from "@/lib/srx-ai-usage";
import { getSrxConnectionSecret } from "@/lib/srx-connections";

export type SrxAiTextProvider = "claude" | "chatgpt" | "gemini" | "deepseek";

export type SrxAiCompleteInput = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** Ép model chỉ trả JSON. */
  json?: boolean;
};

export type SrxAiCompleteResult = {
  text: string;
  provider: SrxAiTextProvider;
  model: string;
};

/** Model mặc định cho từng nhà cung cấp khi người dùng không chỉ định. */
const defaultModels: Record<SrxAiTextProvider, string> = {
  claude: "claude-opus-5",
  chatgpt: "gpt-4o",
  gemini: "gemini-1.5-flash",
  deepseek: "deepseek-chat",
};

const usageProviders: Record<SrxAiTextProvider, SrxAiUsageProvider> = {
  claude: "anthropic",
  chatgpt: "openai",
  gemini: "gemini",
  deepseek: "deepseek",
};

/** Thứ tự ưu tiên khi không chỉ định provider: chọn cái đầu tiên có API key. */
const providerOrder: SrxAiTextProvider[] = ["claude", "chatgpt", "gemini", "deepseek"];

async function readError(response: Response, label: string): Promise<string> {
  const body = await response.text().catch(() => "");

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const message = typeof parsed.error === "string" ? parsed.error : (parsed.error?.message ?? parsed.message ?? "");

    if (message) {
      return `${label}: ${message}`;
    }
  } catch {
    // Không phải JSON.
  }

  return `${label}: HTTP ${response.status}`;
}

async function completeWithClaude(
  apiKey: string,
  model: string,
  input: SrxAiCompleteInput,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens ?? 8000,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Claude"));
  }

  const result = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  if (result.stop_reason === "refusal") {
    throw new Error("Claude từ chối yêu cầu này");
  }

  const text = (result.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  return { text, inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens };
}

async function completeWithOpenAiCompatible(
  apiKey: string,
  model: string,
  baseUrl: string,
  label: string,
  input: SrxAiCompleteInput,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const messages: Array<{ role: string; content: string }> = [];

  if (input.system) {
    messages.push({ role: "system", content: input.system });
  }

  messages.push({ role: "user", content: input.prompt });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: input.maxTokens ?? 8000,
      ...(input.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, label));
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: result.choices?.[0]?.message?.content ?? "",
    inputTokens: result.usage?.prompt_tokens,
    outputTokens: result.usage?.completion_tokens,
  };
}

async function completeWithGemini(
  apiKey: string,
  model: string,
  input: SrxAiCompleteInput,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: input.system ? { parts: [{ text: input.system }] } : undefined,
      generationConfig: {
        maxOutputTokens: input.maxTokens ?? 8000,
        ...(input.json ? { responseMimeType: "application/json" } : {}),
      },
      contents: [{ parts: [{ text: input.prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Gemini"));
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  return {
    text: (result.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("\n"),
    inputTokens: result.usageMetadata?.promptTokenCount,
    outputTokens: result.usageMetadata?.candidatesTokenCount,
  };
}

/** Nhà cung cấp đầu tiên đang có API key, theo thứ tự ưu tiên. */
export async function resolveSrxAiTextProvider(preferred?: SrxAiTextProvider): Promise<SrxAiTextProvider | null> {
  const candidates = preferred ? [preferred, ...providerOrder.filter((item) => item !== preferred)] : providerOrder;

  for (const candidate of candidates) {
    if (await getSrxConnectionSecret(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Gọi model sinh văn bản. Tự chọn nhà cung cấp theo API key đã cấu hình ở trang
 * Quản lý kết nối và ghi nhận token vào báo cáo chi phí.
 */
export async function srxAiComplete(
  input: SrxAiCompleteInput,
  options?: { provider?: SrxAiTextProvider; model?: string },
): Promise<SrxAiCompleteResult> {
  const provider = await resolveSrxAiTextProvider(options?.provider);

  if (!provider) {
    throw new Error("Chưa cấu hình API key cho nhà cung cấp AI nào ở trang Quản lý kết nối");
  }

  const apiKey = await getSrxConnectionSecret(provider);
  const model = options?.model?.trim() ? options.model.trim() : defaultModels[provider];

  let outcome: { text: string; inputTokens?: number; outputTokens?: number };

  if (provider === "claude") {
    outcome = await completeWithClaude(apiKey, model, input);
  } else if (provider === "gemini") {
    outcome = await completeWithGemini(apiKey, model, input);
  } else if (provider === "deepseek") {
    outcome = await completeWithOpenAiCompatible(apiKey, model, "https://api.deepseek.com", "DeepSeek", input);
  } else {
    outcome = await completeWithOpenAiCompatible(apiKey, model, "https://api.openai.com/v1", "OpenAI", input);
  }

  await recordSrxAiUsage({
    provider: usageProviders[provider],
    model,
    inputTokens: outcome.inputTokens,
    outputTokens: outcome.outputTokens,
  });

  return { text: outcome.text, provider, model };
}
