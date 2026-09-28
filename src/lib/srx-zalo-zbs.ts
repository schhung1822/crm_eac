import "server-only";

import { prisma } from "@/lib/prisma";

const ZALO_TEMPLATE_MESSAGE_URL = "https://business.openapi.zalo.me/message/template";
const REQUEST_TIMEOUT_MS = 15_000;

export type ZaloZbsSendResult =
  | { ok: true; msgId: string; response: unknown }
  | { ok: false; errorMessage: string; response?: unknown };

type ZaloTemplateResponse = {
  error?: number;
  message?: string;
  data?: { msg_id?: string; sent_time?: string; quota?: unknown };
};

/** access_token mới nhất của một OA trong bảng token (token_name, VD "zalo_eac"). */
async function readZaloAccessToken(tokenName: string): Promise<string> {
  const token = await prisma.token.findFirst({
    orderBy: { id: "desc" },
    select: { access_token: true },
    where: { token_name: tokenName, access_token: { not: null } },
  });

  const accessToken = token?.access_token?.trim() ?? "";

  if (!accessToken) {
    throw new Error(`Chưa có access_token "${tokenName}" trong bảng token`);
  }

  return accessToken;
}

/**
 * Gửi một tin ZBS Template Message tới số điện thoại (dạng 84xxxxxxxxx).
 * Không ném lỗi khi Zalo từ chối; lỗi được trả về trong kết quả để bên gọi ghi nhật ký.
 */
export async function sendZaloZbsTemplateMessage(input: {
  phone: string;
  templateData: Record<string, string>;
  templateId: string;
  tokenName: string;
  trackingId: string;
}): Promise<ZaloZbsSendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const accessToken = await readZaloAccessToken(input.tokenName);
    const response = await fetch(ZALO_TEMPLATE_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: accessToken },
      body: JSON.stringify({
        phone: input.phone,
        template_id: input.templateId,
        template_data: input.templateData,
        tracking_id: input.trackingId,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    const result = (await response.json().catch(() => ({}))) as ZaloTemplateResponse;

    if (result.error === 0) {
      return { ok: true, msgId: result.data?.msg_id ?? "", response: result };
    }

    const reason = result.message ?? (response.ok ? "Zalo từ chối gửi tin" : `Zalo trả về HTTP ${response.status}`);
    return { ok: false, errorMessage: `${reason} (mã ${result.error ?? response.status})`, response: result };
  } catch (error) {
    return { ok: false, errorMessage: error instanceof Error ? error.message : "Không gọi được API Zalo" };
  } finally {
    clearTimeout(timer);
  }
}
