import type { SrxAffiliateApplicationsWebPayload } from "@/lib/srx-affiliate-applications-web-payload";
import { renderEmailLayout, renderHtmlSection, renderTableSection, sendSrxEmail } from "@/lib/srx-web-mail";
import { escapeHtml, formatGenderLabel, normalizeText } from "@/lib/srx-web-shared";

function buildEmailContent(payload: SrxAffiliateApplicationsWebPayload): {
  html: string;
  subject: string;
  text: string;
} {
  const subject = payload.resubmitted
    ? "SRX Việt Nam đã nhận hồ sơ affiliate gửi lại của bạn"
    : "SRX Việt Nam đã nhận hồ sơ affiliate của bạn";
  const intro = payload.resubmitted
    ? "SRX Việt Nam đã nhận hồ sơ affiliate bạn vừa cập nhật và gửi lại để duyệt. Đội ngũ sẽ kiểm tra và phản hồi sớm nhất."
    : "Cảm ơn bạn đã gửi hồ sơ đăng ký affiliate tại SRX Việt Nam. Hồ sơ của bạn đã được ghi nhận và chuyển sang trạng thái chờ duyệt.";
  const html = renderEmailLayout({
    preheader: "Hồ sơ affiliate của bạn đã được ghi nhận.",
    title: payload.resubmitted ? "Hồ sơ affiliate đã được gửi lại" : "Đã nhận hồ sơ affiliate",
    intro,
    sections: [
      renderTableSection("Thông tin hồ sơ", [
        { label: "Họ tên", value: payload.application.legalFullName },
        { label: "Số điện thoại", value: payload.application.contactPhone },
        { label: "Email", value: payload.application.contactEmail },
        { label: "CCCD", value: payload.application.nationalIdNumber },
        { label: "Giới tính", value: formatGenderLabel(payload.application.gender) },
        { label: "Facebook", value: normalizeText(payload.application.facebookUrl) },
        { label: "TikTok", value: normalizeText(payload.application.tiktokUrl) },
        { label: "Trạng thái", value: "Chờ duyệt" },
      ]),
      renderHtmlSection(
        "Địa chỉ thường trú",
        `<div style="padding:16px;border:1px solid #ece7df;border-radius:14px;color:#201913;font-size:14px;line-height:1.7;">${escapeHtml(payload.application.permanentAddress)}</div>`,
      ),
    ],
    footerNote: `SRX thường cần 3-5 ngày làm việc để xem xét hồ sơ affiliate. Bạn có thể theo dõi trạng thái tại ${payload.siteOrigin ?? "website SRX Việt Nam"}.`,
  });
  const text = [
    "SRX Việt Nam - Đã nhận hồ sơ affiliate",
    "",
    intro,
    "",
    `Họ tên: ${payload.application.legalFullName}`,
    `Số điện thoại: ${payload.application.contactPhone}`,
    `Email: ${payload.application.contactEmail}`,
    `CCCD: ${payload.application.nationalIdNumber}`,
    `Địa chỉ thường trú: ${payload.application.permanentAddress}`,
    `Facebook: ${normalizeText(payload.application.facebookUrl)}`,
    `TikTok: ${normalizeText(payload.application.tiktokUrl)}`,
    "Trạng thái: Chờ duyệt",
    "",
    "SRX thường cần 3-5 ngày làm việc để xem xét hồ sơ affiliate.",
  ].join("\n");

  return { html, subject, text };
}

export async function sendSrxAffiliateApplicationsWebConfirmationEmail(
  payload: SrxAffiliateApplicationsWebPayload,
): Promise<boolean> {
  const emailContent = buildEmailContent(payload);

  return sendSrxEmail({
    to: payload.application.contactEmail,
    ...emailContent,
  });
}
