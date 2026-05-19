import nodemailer, { type Transporter } from "nodemailer";

import { escapeHtml } from "@/lib/srx-web-shared";

type MailRow = {
  label: string;
  value: string;
};

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

export async function sendSrxEmail({
  html,
  subject,
  text,
  to,
}: {
  html: string;
  subject: string;
  text: string;
  to: string;
}): Promise<boolean> {
  const mailTransporter = getTransporter();

  if (!mailTransporter || !to) {
    return false;
  }

  await mailTransporter.sendMail({
    from: getFromAddress(),
    html,
    subject,
    text,
    to,
  });

  return true;
}

export function renderEmailLayout({
  footerNote,
  intro,
  preheader,
  sections,
  title,
}: {
  footerNote?: string;
  intro: string;
  preheader: string;
  sections: string[];
  title: string;
}): string {
  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f6f2eb;padding:24px 12px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#201913;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
        <div style="margin:0 auto;max-width:680px;background:#ffffff;border:1px solid #ece7df;border-radius:20px;overflow:hidden;">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#6f8ff8 0%,#ebb1e7 100%);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">SRX Việt Nam</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;font-weight:700;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 24px;color:#3d332b;font-size:15px;line-height:1.8;">${escapeHtml(intro)}</p>
            ${sections.join("")}
            <p style="margin:28px 0 0;color:#6a5e53;font-size:13px;line-height:1.7;">
              ${escapeHtml(footerNote ?? "Nếu cần hỗ trợ, vui lòng phản hồi email này hoặc liên hệ SRX Việt Nam.")}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderPrimaryAction({ href, label }: { href: string; label: string }): string {
  return `
    <div style="margin:0 0 24px;">
      <a
        href="${escapeHtml(href)}"
        style="display:inline-block;border-radius:999px;background:#15110d;padding:14px 24px;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.02em;text-decoration:none;"
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

export function renderTableSection(title: string, rows: MailRow[]): string {
  const tableRows = rows
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
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${tableRows}</table>
    </div>
  `;
}

export function renderHtmlSection(title: string, html: string): string {
  return `
    <div style="margin:0 0 24px;">
      ${title ? `<div style="margin:0 0 10px;color:#201913;font-size:16px;font-weight:700;">${escapeHtml(title)}</div>` : ""}
      ${html}
    </div>
  `;
}
