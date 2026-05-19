import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";
import {
  buildCheckoutPaymentUrl,
  buildShippingAddress,
  formatCurrencyVnd,
  formatOrderItemLines,
  formatPaymentStatusLabel,
  normalizeText,
} from "@/lib/srx-orders-web-shared";

const DEFAULT_LARK_WEBHOOK_URL =
  "https://open.larksuite.com/open-apis/bot/v2/hook/4e741a32-ca82-4381-8b37-5825c7d91f37";
const configuredLarkWebhookUrl = process.env.LARK_WEBHOOK_URL?.trim();
const larkWebhookUrl =
  configuredLarkWebhookUrl && configuredLarkWebhookUrl.length > 0 ? configuredLarkWebhookUrl : DEFAULT_LARK_WEBHOOK_URL;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildField(label: string, value: string, isShort = true) {
  return {
    is_short: isShort,
    text: {
      content: `**${label}:**\n${normalizeText(value)}`,
      tag: "lark_md",
    },
  };
}

function buildCard(payload: SrxOrdersWebPayload) {
  const paymentUrl = buildCheckoutPaymentUrl(payload);
  const cardElements = [
    {
      fields: [
        buildField("Tổng thanh toán", formatCurrencyVnd(payload.totals.grandTotal)),
        buildField("Thanh toán", payload.payment.methodLabel),
        buildField("Trạng thái", formatPaymentStatusLabel(payload.payment.status)),
        buildField("Mã đơn", payload.orderNumber),
      ],
      tag: "div",
    },
    { tag: "hr" },
    {
      fields: [
        buildField("Khách hàng", payload.customer.fullName),
        buildField("Số điện thoại", payload.customer.phone),
        buildField("Email", payload.customer.email),
        buildField("Địa chỉ", buildShippingAddress(payload.customer)),
      ],
      tag: "div",
    },
    { tag: "hr" },
    {
      tag: "div",
      text: {
        content: `**Sản phẩm:**\n${formatOrderItemLines(payload.items)}`,
        tag: "lark_md",
      },
    },
  ];

  if (paymentUrl) {
    cardElements.push(
      { tag: "hr" },
      {
        tag: "div",
        text: {
          content: `**Thanh toán tiếp:**\n[${paymentUrl}](${paymentUrl})`,
          tag: "lark_md",
        },
      },
    );
  }

  cardElements.push(
    { tag: "hr" },
    {
      fields: [
        buildField("Ghi chú", payload.notes ?? "Không có", false),
        buildField("Nguồn", payload.source ?? "Website SRX Việt Nam", false),
      ],
      tag: "div",
    },
  );

  return {
    card: {
      config: {
        wide_screen_mode: true,
      },
      elements: cardElements,
      header: {
        template: "grey",
        title: {
          content: `Đơn hàng mới #${payload.orderNumber}`,
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

async function sendLarkRequest(payload: ReturnType<typeof buildCard>): Promise<void> {
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

async function postToLark(payload: ReturnType<typeof buildCard>): Promise<void> {
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

export async function sendSrxOrderWebLarkNotification(payload: SrxOrdersWebPayload): Promise<void> {
  await postToLark(buildCard(payload));
}
