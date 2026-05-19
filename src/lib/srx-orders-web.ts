import { sendSrxOrderWebLarkNotification } from "@/lib/srx-orders-web-lark";
import { sendSrxOrderWebConfirmationEmail } from "@/lib/srx-orders-web-mail";
import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";

export async function dispatchSrxOrderWebNotifications(payload: SrxOrdersWebPayload): Promise<void> {
  const [larkResult, mailResult] = await Promise.allSettled([
    sendSrxOrderWebLarkNotification(payload),
    sendSrxOrderWebConfirmationEmail(payload),
  ]);

  if (larkResult.status === "rejected") {
    console.error("SRX orders_web Lark error:", larkResult.reason);
  }

  if (mailResult.status === "rejected") {
    console.error("SRX orders_web mail error:", mailResult.reason);
  }
}
