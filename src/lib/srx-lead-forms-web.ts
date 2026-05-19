import { sendSrxLeadFormsWebLarkNotification } from "@/lib/srx-lead-forms-web-lark";
import type { SrxLeadFormsWebPayload } from "@/lib/srx-lead-forms-web-payload";

export async function dispatchSrxLeadFormsWebNotifications(payload: SrxLeadFormsWebPayload): Promise<void> {
  try {
    await sendSrxLeadFormsWebLarkNotification(payload);
  } catch (error) {
    console.error("SRX lead-forms-web Lark error:", error);
  }
}
