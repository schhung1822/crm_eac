import { sendSrxAffiliateApplicationsWebLarkNotification } from "@/lib/srx-affiliate-applications-web-lark";
import { sendSrxAffiliateApplicationsWebConfirmationEmail } from "@/lib/srx-affiliate-applications-web-mail";
import type { SrxAffiliateApplicationsWebPayload } from "@/lib/srx-affiliate-applications-web-payload";

export async function dispatchSrxAffiliateApplicationsWebNotifications(
  payload: SrxAffiliateApplicationsWebPayload,
): Promise<void> {
  const [larkResult, mailResult] = await Promise.allSettled([
    sendSrxAffiliateApplicationsWebLarkNotification(payload),
    sendSrxAffiliateApplicationsWebConfirmationEmail(payload),
  ]);

  if (larkResult.status === "rejected") {
    console.error("SRX affiliate-applications-web Lark error:", larkResult.reason);
  }

  if (mailResult.status === "rejected") {
    console.error("SRX affiliate-applications-web mail error:", mailResult.reason);
  }
}
