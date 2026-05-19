import type { SrxAffiliateApplicationsWebPayload } from "@/lib/srx-affiliate-applications-web-payload";
import { buildInteractiveCard, buildMultilineMarkdown, buildStackedField, postToSrxLark } from "@/lib/srx-web-lark";
import { formatGenderLabel } from "@/lib/srx-web-shared";

export async function sendSrxAffiliateApplicationsWebLarkNotification(
  payload: SrxAffiliateApplicationsWebPayload,
): Promise<void> {
  const titlePrefix = payload.resubmitted ? "Hồ sơ affiliate gửi lại cần duyệt" : "Hồ sơ affiliate mới cần duyệt";
  const cardPayload = buildInteractiveCard({
    title: `${titlePrefix} - ${payload.application.legalFullName}`,
    template: "indigo",
    elements: [
      {
        tag: "div",
        fields: [
          buildStackedField("Họ và tên pháp lý", payload.application.legalFullName, true),
          buildStackedField("Số điện thoại", payload.application.contactPhone, true),
          buildStackedField("Email liên hệ", payload.application.contactEmail, true),
          buildStackedField("Tài khoản SRX", payload.accountLabel, true),
        ],
      },
      {
        tag: "hr",
      },
      {
        tag: "div",
        fields: [
          buildStackedField("CCCD", payload.application.nationalIdNumber, true),
          buildStackedField("Giới tính", formatGenderLabel(payload.application.gender), true),
          buildStackedField("Trạng thái", "Chờ duyệt", true),
          buildStackedField("Nguồn", payload.source ?? "Website SRX Viet Nam", true),
        ],
      },
      {
        tag: "hr",
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: buildMultilineMarkdown("Địa chỉ thường trú", payload.application.permanentAddress),
        },
      },
      {
        tag: "hr",
      },
      {
        tag: "div",
        fields: [
          buildStackedField("Facebook", payload.application.facebookUrl),
          buildStackedField("TikTok", payload.application.tiktokUrl),
        ],
      },
    ],
  });

  await postToSrxLark(cardPayload);
}
