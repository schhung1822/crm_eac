import { normalizeText } from "@/lib/srx-web-shared";

const DEFAULT_LARK_WEBHOOK_URL =
  "https://open.larksuite.com/open-apis/bot/v2/hook/4e741a32-ca82-4381-8b37-5825c7d91f37";
const configuredLarkWebhookUrl = process.env.LARK_WEBHOOK_URL?.trim();
const larkWebhookUrl =
  configuredLarkWebhookUrl && configuredLarkWebhookUrl.length > 0 ? configuredLarkWebhookUrl : DEFAULT_LARK_WEBHOOK_URL;

type LarkText = {
  content: string;
  tag: "lark_md" | "plain_text";
};

type LarkField = {
  is_short: boolean;
  text: LarkText;
};

type LarkElement = {
  fields?: LarkField[];
  tag: string;
  text?: LarkText;
};

type LarkCardPayload = {
  card: {
    config: {
      wide_screen_mode: boolean;
    };
    elements: LarkElement[];
    header: {
      template: string;
      title: {
        content: string;
        tag: "plain_text";
      };
    };
  };
  msg_type: "interactive";
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function buildField(label: string, value: unknown, isShort = false): LarkField {
  return {
    is_short: isShort,
    text: {
      content: `**${label}**: ${normalizeText(value)}`,
      tag: "lark_md",
    },
  };
}

export function buildStackedField(label: string, value: unknown, isShort = false): LarkField {
  return {
    is_short: isShort,
    text: {
      content: `**${label}:**\n${normalizeText(value)}`,
      tag: "lark_md",
    },
  };
}

export function buildMultilineMarkdown(label: string, value: unknown): string {
  return `**${label}:**\n${normalizeText(value)}`;
}

export function buildInteractiveCard({
  elements,
  template = "blue",
  title,
}: {
  elements: LarkElement[];
  template?: string;
  title: string;
}): LarkCardPayload {
  return {
    card: {
      config: {
        wide_screen_mode: true,
      },
      elements,
      header: {
        template,
        title: {
          content: title,
          tag: "plain_text",
        },
      },
    },
    msg_type: "interactive",
  };
}

function assertLarkResponse(responseText: string): void {
  if (!responseText) {
    return;
  }

  const responseData = JSON.parse(responseText) as { code?: number; msg?: string };

  if (typeof responseData.code === "number" && responseData.code !== 0) {
    throw new Error(`Lark webhook rejected payload (${responseData.code}): ${responseData.msg ?? "Unknown error"}`);
  }
}

async function sendLarkRequest(payload: LarkCardPayload): Promise<void> {
  const response = await fetch(larkWebhookUrl, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Lark webhook failed (${response.status}): ${responseText}`);
  }

  assertLarkResponse(responseText);
}

export async function postToSrxLark(payload: LarkCardPayload): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await sendLarkRequest(payload);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown Lark webhook error.");

      if (attempt < 3) {
        await wait(attempt * 500);
      }
    }
  }

  throw lastError ?? new Error("Lark webhook request failed.");
}
