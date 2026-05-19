import nodemailer, { type Transporter } from "nodemailer";

import type { SrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";
import {
  buildCheckoutPaymentUrl,
  buildShippingAddress,
  escapeHtml,
  formatCurrencyVnd,
  formatPaymentStatusLabel,
  normalizeText,
} from "@/lib/srx-orders-web-shared";

const smtpHost = process.env.SMTP_HOST?.trim() ?? "";
const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtpSecure =
  String(process.env.SMTP_SECURE ?? smtpPort === 465)
    .trim()
    .toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER?.trim() ?? "";
const smtpPass = process.env.SMTP_PASS?.trim() ?? "";
const configuredSmtpFromEmail = process.env.SMTP_FROM_EMAIL?.trim();
const configuredSmtpFromName = process.env.SMTP_FROM_NAME?.trim();
const smtpFromEmail =
  configuredSmtpFromEmail && configuredSmtpFromEmail.length > 0 ? configuredSmtpFromEmail : smtpUser;
const smtpFromName =
  configuredSmtpFromName && configuredSmtpFromName.length > 0 ? configuredSmtpFromName : "SRX Việt Nam";

type MailRow = {
  label: string;
  value: string;
};

let transporter: null | Transporter | undefined;

function getTransporter(): null | Transporter {
  if (transporter !== undefined) {
    return transporter;
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    auth: {
      pass: smtpPass,
      user: smtpUser,
    },
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
  });

  return transporter;
}

function getFromAddress(): string | undefined {
  return smtpFromEmail ? `"${smtpFromName.replaceAll('"', "")}" <${smtpFromEmail}>` : undefined;
}

function renderTableSection(title: string, rows: MailRow[]): string {
  const sectionRows = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #ece7df;color:#6a5e53;font-size:14px;vertical-align:top;width:180px;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #ece7df;color:#201913;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="margin:0 0 24px;">
      <div style="margin:0 0 10px;color:#201913;font-size:16px;font-weight:700;">${escapeHtml(title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${sectionRows}</table>
    </div>
  `;
}

function renderHtmlSection(title: string, html: string): string {
  return `
    <div style="margin:0 0 24px;">
      ${title ? `<div style="margin:0 0 10px;color:#201913;font-size:16px;font-weight:700;">${escapeHtml(title)}</div>` : ""}
      ${html}
    </div>
  `;
}

function renderPrimaryAction(href: string, label: string): string {
  return `
    <a
      href="${escapeHtml(href)}"
      style="display:inline-block;border-radius:999px;background:#15110d;padding:14px 24px;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.02em;text-decoration:none;"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function renderOrderItemsTable(items: SrxOrdersWebPayload["items"]): string {
  const rows = items
    .map((item) => {
      const itemVariant = normalizeText(item.variantLabel, "");
      const lineTotal = item.lineTotal ?? item.price * item.quantity;

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ece7df;color:#201913;font-size:14px;line-height:1.6;">
            <div style="font-weight:700;">${escapeHtml(item.name)}</div>
            ${itemVariant ? `<div style="color:#6a5e53;font-size:12px;">${escapeHtml(itemVariant)}</div>` : ""}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #ece7df;color:#201913;font-size:14px;text-align:center;">${item.quantity}</td>
          <td style="padding:12px 0;border-bottom:1px solid #ece7df;color:#201913;font-size:14px;text-align:right;">${escapeHtml(formatCurrencyVnd(item.price))}</td>
          <td style="padding:12px 0;border-bottom:1px solid #ece7df;color:#201913;font-size:14px;text-align:right;font-weight:700;">${escapeHtml(formatCurrencyVnd(lineTotal))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 12px;color:#6a5e53;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Sản phẩm</th>
          <th align="center" style="padding:0 0 12px;color:#6a5e53;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">SL</th>
          <th align="right" style="padding:0 0 12px;color:#6a5e53;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Đơn giá</th>
          <th align="right" style="padding:0 0 12px;color:#6a5e53;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildOrderInfoRows(payload: SrxOrdersWebPayload): MailRow[] {
  return [
    { label: "Mã đơn hàng", value: payload.orderNumber },
    { label: "Nguồn", value: payload.source ?? "Website SRX Việt Nam" },
    { label: "Phương thức thanh toán", value: payload.payment.methodLabel },
    { label: "Trạng thái thanh toán", value: formatPaymentStatusLabel(payload.payment.status) },
    { label: "Tạm tính", value: formatCurrencyVnd(payload.totals.subtotal) },
    { label: "Giảm giá", value: formatCurrencyVnd(payload.totals.discountTotal) },
    { label: "Tổng thanh toán", value: formatCurrencyVnd(payload.totals.grandTotal) },
    { label: "Ghi chú", value: payload.notes ?? "Không có" },
  ];
}

function buildPaymentInstructionRows(payload: SrxOrdersWebPayload): MailRow[] {
  const paymentDetails = payload.payment.details;

  if (!paymentDetails) {
    return [];
  }

  return [
    { label: "Ngân hàng", value: paymentDetails.bankName },
    { label: "Chủ tài khoản", value: paymentDetails.accountName },
    { label: "Số tài khoản", value: paymentDetails.accountNumber },
    { label: "Số tiền", value: formatCurrencyVnd(paymentDetails.amount) },
    { label: "Nội dung chuyển khoản", value: paymentDetails.transferContent },
  ];
}

function buildEmailContent(payload: SrxOrdersWebPayload): { html: string; subject: string; text: string } {
  const paymentUrl = buildCheckoutPaymentUrl(payload);
  const intro = paymentUrl
    ? `Cảm ơn ${normalizeText(payload.customer.fullName)} đã đặt hàng tại SRX Việt Nam. Đơn hàng của bạn đã được ghi nhận, vui lòng hoàn tất thanh toán để SRX bắt đầu xử lý.`
    : `Cảm ơn ${normalizeText(payload.customer.fullName)} đã đặt hàng tại SRX Việt Nam. Đơn hàng của bạn đã được ghi nhận và đội ngũ SRX sẽ xử lý trong thời gian sớm nhất.`;
  const sections = [
    paymentUrl ? renderHtmlSection("", renderPrimaryAction(paymentUrl, "Tiếp tục thanh toán")) : "",
    renderTableSection("Thông tin đơn hàng", buildOrderInfoRows(payload)),
    renderTableSection("Thông tin nhận hàng", [
      { label: "Họ và tên", value: payload.customer.fullName },
      { label: "Số điện thoại", value: payload.customer.phone },
      { label: "Email", value: payload.customer.email },
      { label: "Địa chỉ", value: buildShippingAddress(payload.customer) },
    ]),
    renderHtmlSection("Sản phẩm trong đơn", renderOrderItemsTable(payload.items)),
  ];
  const paymentInstructionRows = buildPaymentInstructionRows(payload);

  if (paymentInstructionRows.length > 0) {
    sections.push(renderTableSection("Hướng dẫn chuyển khoản", paymentInstructionRows));
  }

  const html = `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(`SRX Việt Nam xác nhận đơn hàng ${payload.orderNumber}`)}</title>
      </head>
      <body style="margin:0;background:#f6f2eb;padding:24px 12px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#201913;">
        <div style="margin:0 auto;max-width:680px;background:#ffffff;border:1px solid #ece7df;border-radius:20px;overflow:hidden;">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#6f8ff8 0%,#ebb1e7 100%);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">SRX Việt Nam</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Đặt hàng thành công</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 24px;color:#3d332b;font-size:15px;line-height:1.8;">${escapeHtml(intro)}</p>
            ${sections.filter(Boolean).join("")}
          </div>
        </div>
      </body>
    </html>
  `;
  const textLines = [
    "SRX Việt Nam - Đặt hàng thành công",
    "",
    intro,
    "",
    ...buildOrderInfoRows(payload).map((row) => `${row.label}: ${row.value}`),
    "",
    "Thông tin nhận hàng:",
    `- Họ và tên: ${payload.customer.fullName}`,
    `- Số điện thoại: ${payload.customer.phone}`,
    `- Email: ${payload.customer.email}`,
    `- Địa chỉ: ${buildShippingAddress(payload.customer)}`,
    "",
    "Sản phẩm:",
    ...payload.items.map((item) => {
      const itemVariant = normalizeText(item.variantLabel, "");
      const itemLabel = itemVariant ? `${item.name} (${itemVariant})` : item.name;
      const lineTotal = item.lineTotal ?? item.price * item.quantity;
      return `- ${itemLabel} x${item.quantity}: ${formatCurrencyVnd(lineTotal)}`;
    }),
  ];

  if (paymentInstructionRows.length > 0) {
    textLines.push(
      "",
      "Hướng dẫn chuyển khoản:",
      ...paymentInstructionRows.map((row) => `- ${row.label}: ${row.value}`),
    );
  }

  if (paymentUrl) {
    textLines.push("", `Thanh toán tiếp tại: ${paymentUrl}`);
  }

  return {
    html,
    subject: `SRX Việt Nam xác nhận đơn hàng ${payload.orderNumber}`,
    text: textLines.join("\n"),
  };
}

export async function sendSrxOrderWebConfirmationEmail(payload: SrxOrdersWebPayload): Promise<boolean> {
  const mailTransporter = getTransporter();

  if (!mailTransporter || !payload.customer.email) {
    return false;
  }

  const emailContent = buildEmailContent(payload);

  await mailTransporter.sendMail({
    from: getFromAddress(),
    html: emailContent.html,
    subject: emailContent.subject,
    text: emailContent.text,
    to: payload.customer.email,
  });

  return true;
}
