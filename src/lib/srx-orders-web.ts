import { sendCompleteRegistrationForOrder } from "@/lib/meta-conversions";
import { sendSrxOrderWebLarkNotification } from "@/lib/srx-orders-web-lark";
import { sendSrxOrderWebConfirmationEmail } from "@/lib/srx-orders-web-mail";
import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";

export async function dispatchSrxOrderWebNotifications(payload: SrxOrdersWebPayload): Promise<void> {
  const [larkResult, mailResult, metaResult] = await Promise.allSettled([
    sendSrxOrderWebLarkNotification(payload),
    sendSrxOrderWebConfirmationEmail(payload),
    sendCompleteRegistrationForOrder(payload.orderNumber),
  ]);

  if (larkResult.status === "rejected") {
    console.error("SRX orders_web Lark error:", larkResult.reason);
  }

  if (mailResult.status === "rejected") {
    console.error("SRX orders_web mail error:", mailResult.reason);
  }

  if (metaResult.status === "rejected") {
    console.error("SRX orders_web Meta CompleteRegistration error:", metaResult.reason);
  }
}
