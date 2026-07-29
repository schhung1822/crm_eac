import "server-only";

import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type SrxAiUsageProvider = "openai" | "gemini" | "anthropic" | "deepseek";

export type SrxAiUsageEntry = {
  at: string;
  provider: SrxAiUsageProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type SrxAiUsageReport = {
  inputTokens: number;
  outputTokens: number;
  /** Chi phí ước tính theo bảng giá bên dưới, đơn vị USD. */
  costUsd: number;
  costVnd: number;
  usdToVndRate: number;
  /** Số bản ghi đã tính. */
  calls: number;
  firstAt: string | null;
  lastAt: string | null;
  byModel: Array<{
    provider: SrxAiUsageProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    calls: number;
  }>;
};

const dataDirectory = path.join(process.cwd(), ".data");
const usageLogPath = path.join(dataDirectory, "srx-ai-usage.jsonl");

const DEFAULT_USD_TO_VND = 26250;

/**
 * Giá niêm yết USD trên 1 triệu token, dùng để ước tính chi phí.
 * Giá nhà cung cấp có thể đổi — cập nhật bảng này khi cần con số chính xác.
 */
const modelPricing: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-image-1": { input: 5, output: 40 },
  "gpt-image-1-mini": { input: 2, output: 8 },
  // Google
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-flash-8b": { input: 0.0375, output: 0.15 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  // DeepSeek
  "deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
};

/** Giá mặc định khi model không có trong bảng, để tránh báo cáo về 0. */
const fallbackPricing: Record<SrxAiUsageProvider, { input: number; output: number }> = {
  anthropic: { input: 3, output: 15 },
  openai: { input: 2.5, output: 10 },
  gemini: { input: 0.5, output: 1.5 },
  deepseek: { input: 0.27, output: 1.1 },
};

function getUsdToVndRate(): number {
  const fromEnv = Number(process.env.SRX_USD_VND_RATE);

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_USD_TO_VND;
}

function getPricing(provider: SrxAiUsageProvider, model: string) {
  return modelPricing[model] ?? fallbackPricing[provider];
}

function computeCostUsd(
  provider: SrxAiUsageProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = getPricing(provider, model);

  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

function toPositiveInteger(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

/**
 * Ghi một lần gọi AI vào log. Không bao giờ ném lỗi ra ngoài để việc ghi thống kê
 * không làm hỏng luồng gọi AI chính.
 */
export async function recordSrxAiUsage(entry: {
  provider: SrxAiUsageProvider;
  model: string;
  inputTokens: unknown;
  outputTokens: unknown;
}): Promise<void> {
  try {
    const inputTokens = toPositiveInteger(entry.inputTokens);
    const outputTokens = toPositiveInteger(entry.outputTokens);

    if (inputTokens === 0 && outputTokens === 0) {
      return;
    }

    if (!existsSync(dataDirectory)) {
      await mkdir(dataDirectory, { recursive: true });
    }

    const record: SrxAiUsageEntry = {
      at: new Date().toISOString(),
      provider: entry.provider,
      model: entry.model || "unknown",
      inputTokens,
      outputTokens,
    };

    await appendFile(usageLogPath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error("Không ghi được thống kê token AI:", error);
  }
}

function parseUsageLine(line: string): SrxAiUsageEntry | null {
  try {
    const parsed = JSON.parse(line) as Partial<SrxAiUsageEntry>;

    if (!parsed.provider || !parsed.at) {
      return null;
    }

    return {
      at: parsed.at,
      provider: parsed.provider,
      model: parsed.model ?? "unknown",
      inputTokens: toPositiveInteger(parsed.inputTokens),
      outputTokens: toPositiveInteger(parsed.outputTokens),
    };
  } catch {
    return null;
  }
}

function createEmptyReport(): SrxAiUsageReport {
  return {
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    costVnd: 0,
    usdToVndRate: getUsdToVndRate(),
    calls: 0,
    firstAt: null,
    lastAt: null,
    byModel: [],
  };
}

export async function getSrxAiUsageReport(): Promise<SrxAiUsageReport> {
  const report = createEmptyReport();

  let raw: string;

  try {
    raw = await readFile(usageLogPath, "utf8");
  } catch {
    return report;
  }

  const buckets = new Map<string, SrxAiUsageReport["byModel"][number]>();

  for (const line of raw.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const entry = parseUsageLine(line);

    if (!entry) {
      continue;
    }

    const costUsd = computeCostUsd(entry.provider, entry.model, entry.inputTokens, entry.outputTokens);

    report.inputTokens += entry.inputTokens;
    report.outputTokens += entry.outputTokens;
    report.costUsd += costUsd;
    report.calls += 1;
    report.firstAt = report.firstAt && report.firstAt < entry.at ? report.firstAt : entry.at;
    report.lastAt = report.lastAt && report.lastAt > entry.at ? report.lastAt : entry.at;

    const key = `${entry.provider}:${entry.model}`;
    const bucket = buckets.get(key) ?? {
      provider: entry.provider,
      model: entry.model,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      calls: 0,
    };

    bucket.inputTokens += entry.inputTokens;
    bucket.outputTokens += entry.outputTokens;
    bucket.costUsd += costUsd;
    bucket.calls += 1;
    buckets.set(key, bucket);
  }

  report.costVnd = report.costUsd * report.usdToVndRate;
  report.byModel = [...buckets.values()].sort((left, right) => right.costUsd - left.costUsd);

  return report;
}
