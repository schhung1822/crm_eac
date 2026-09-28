import { sendCompleteRegistrationForOrder } from "@/lib/meta-conversions";
import { syncSrxOrderToKiotViet } from "@/lib/srx-kiotviet-orders";
import { sendSrxOrderWebLarkNotification } from "@/lib/srx-orders-web-lark";
import { sendSrxOrderWebConfirmationEmail } from "@/lib/srx-orders-web-mail";
import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";

export async function dispatchSrxOrderWebNotifications(payload: SrxOrdersWebPayload): Promise<void> {
  const [larkResult, mailResult, metaResult, kiotvietResult] = await Promise.allSettled([
    sendSrxOrderWebLarkNotification(payload),
    sendSrxOrderWebConfirmationEmail(payload),
    sendCompleteRegistrationForOrder(payload.orderNumber),
    syncSrxOrderToKiotViet({ orderNumber: payload.orderNumber }),
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

  // Lỗi KiotViet được ghi vào kiotviet_order_syncs; nhân viên gửi lại từ trang chi tiết đơn.
  if (kiotvietResult.status === "rejected") {
    console.error("SRX orders_web KiotViet sync error:", kiotvietResult.reason);
  } else if (kiotvietResult.value.status === "failed") {
    console.error("SRX orders_web KiotViet sync failed:", kiotvietResult.value.errorMessage);
  }
}
