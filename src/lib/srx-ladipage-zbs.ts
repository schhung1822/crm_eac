import "server-only";

import { randomInt } from "node:crypto";

import { prisma2 } from "@/lib/prisma2";
import { ensureLadipageZbsTables } from "@/lib/srx-ladipage-zbs-tables";
import {
  buildSrxLadipageZbsTemplateData,
  normalizeZbsPhone,
  parseSrxLadipageZbsLog,
  parseSrxLadipageZbsSettings,
  srxLadipageZbsTestInputSchema,
  type SrxLadipageZbsLog,
  type SrxLadipageZbsSettings,
  type SrxLadipageZbsTemplateData,
} from "@/lib/srx-ladipage-zbs.shared";
import { sendZaloZbsTemplateMessage } from "@/lib/srx-zalo-zbs";

const ZALO_TOKEN_NAME = "zalo_eac";
const CODE_PREFIX = "SK";
// Bỏ các ký tự dễ nhầm (0/O, 1/I) vì khách có thể phải đọc mã cho nhân viên.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;
// Định dạng tham số kiểu date của Zalo; lấy nguyên giờ đã lưu trong SQL, không đổi múi giờ.
const SQL_TIME_FORMAT = "%H:%i:%s %d/%m/%Y";

function isDuplicateKeyError(error: unknown, keyName: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Duplicate entry") && message.includes(keyName);
}

// ---------- Cấu hình ----------

type SettingsRow = {
  enabled: number | boolean;
  template_id: string;
  event_name: string;
  event_location: string;
  event_format: string;
};

/** Cấu hình ZBS của một sự kiện; null khi chưa từng lưu. */
export async function getSrxLadipageZbsSettings(eventId: string): Promise<SrxLadipageZbsSettings | null> {
  await ensureLadipageZbsTables();

  const rows = await prisma2.$queryRawUnsafe<SettingsRow[]>(
    "SELECT enabled, template_id, event_name, event_location, event_format FROM ladipage_zbs_settings WHERE event_id = ? LIMIT 1",
    BigInt(eventId),
  );
  const row = rows.at(0);

  return row ? parseSrxLadipageZbsSettings({ ...row, enabled: Boolean(Number(row.enabled)) }) : null;
}

export async function saveSrxLadipageZbsSettings(eventId: string, input: unknown): Promise<SrxLadipageZbsSettings> {
  const settings = parseSrxLadipageZbsSettings(input);

  await ensureLadipageZbsTables();
  await prisma2.$executeRawUnsafe(
    `
      INSERT INTO ladipage_zbs_settings (event_id, enabled, template_id, event_name, event_location, event_format)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        template_id = VALUES(template_id),
        event_name = VALUES(event_name),
        event_location = VALUES(event_location),
        event_format = VALUES(event_format)
    `,
    BigInt(eventId),
    settings.enabled ? 1 : 0,
    settings.template_id,
    settings.event_name,
    settings.event_location,
    settings.event_format,
  );

  return settings;
}

// ---------- Nhật ký gửi ----------

type LogRow = {
  id: bigint;
  registration_id: bigint | null;
  is_test: number | boolean;
  code: string;
  phone: string;
  customer_name: string | null;
  status: string;
  msg_id: string | null;
  error_message: string | null;
  created_at: Date;
  sent_at: Date | null;
};

export async function getSrxLadipageZbsLogs(eventId: string, limit = 30): Promise<SrxLadipageZbsLog[]> {
  await ensureLadipageZbsTables();

  const rows = await prisma2.$queryRawUnsafe<LogRow[]>(
    `
      SELECT id, registration_id, is_test, code, phone, customer_name, status, msg_id, error_message, created_at, sent_at
      FROM ladipage_zbs_logs
      WHERE event_id = ?
      ORDER BY id DESC
      LIMIT ${Math.min(100, Math.max(1, Math.floor(limit)))}
    `,
    BigInt(eventId),
  );

  return rows.map((row) =>
    parseSrxLadipageZbsLog({
      ...row,
      id: row.id.toString(),
      registration_id: row.registration_id?.toString() ?? null,
      is_test: Boolean(Number(row.is_test)),
      customer_name: row.customer_name ?? "",
      msg_id: row.msg_id ?? "",
      error_message: row.error_message ?? "",
    }),
  );
}

function generateRegistrationCode(): string {
  let code = CODE_PREFIX;

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }

  return code;
}

type PendingLogInput = {
  customerName: string;
  eventId: string;
  isTest: boolean;
  phone: string;
  registrationId: string | null;
  templateId: string;
  buildTemplateData: (code: string) => SrxLadipageZbsTemplateData;
};

type PendingLog = { logId: bigint; templateData: SrxLadipageZbsTemplateData };

/**
 * Ghi dòng "pending" để giữ chỗ mã đăng ký (UNIQUE) và chặn gửi trùng cho cùng một lượt đăng ký.
 * Trả về null nếu lượt đăng ký này đã được xử lý trước đó.
 */
async function createPendingLog(input: PendingLogInput): Promise<PendingLog | null> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateRegistrationCode();
    const templateData = input.buildTemplateData(code);

    try {
      await prisma2.$executeRawUnsafe(
        `
          INSERT INTO ladipage_zbs_logs
            (event_id, registration_id, is_test, code, phone, customer_name, template_id, template_data, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
        BigInt(input.eventId),
        input.registrationId ? BigInt(input.registrationId) : null,
        input.isTest ? 1 : 0,
        code,
        input.phone,
        input.customerName,
        input.templateId,
        JSON.stringify(templateData),
      );

      const rows = await prisma2.$queryRawUnsafe<{ id: bigint }[]>(
        "SELECT id FROM ladipage_zbs_logs WHERE code = ? LIMIT 1",
        code,
      );
      const logId = rows.at(0)?.id;

      if (!logId) {
        throw new Error("Không đọc lại được nhật ký ZBS vừa tạo");
      }

      return { logId, templateData };
    } catch (error) {
      if (isDuplicateKeyError(error, "uq_ladipage_zbs_logs_registration")) {
        return null;
      }

      if (!isDuplicateKeyError(error, "uq_ladipage_zbs_logs_code")) {
        throw error;
      }
    }
  }

  throw new Error("Không tạo được mã đăng ký không trùng");
}

async function finishLog(
  logId: bigint,
  result: { status: "sent" | "failed"; msgId?: string; errorMessage?: string; response?: unknown },
): Promise<void> {
  await prisma2.$executeRawUnsafe(
    `
      UPDATE ladipage_zbs_logs
      SET status = ?, msg_id = ?, error_message = ?, response_json = ?,
          sent_at = IF(? = 'sent', NOW(), sent_at)
      WHERE id = ?
    `,
    result.status,
    result.msgId ?? null,
    result.errorMessage ?? null,
    result.response === undefined ? null : JSON.stringify(result.response),
    result.status,
    logId,
  );
}

async function deliver(pending: PendingLog, phone: string, templateId: string) {
  const result = await sendZaloZbsTemplateMessage({
    phone,
    templateData: pending.templateData,
    templateId,
    tokenName: ZALO_TOKEN_NAME,
    trackingId: `ladipage-zbs-${pending.logId.toString()}`,
  });

  if (result.ok) {
    await finishLog(pending.logId, { status: "sent", msgId: result.msgId, response: result.response });
    return { ok: true, code: pending.templateData.code };
  }

  await finishLog(pending.logId, { status: "failed", errorMessage: result.errorMessage, response: result.response });
  return { ok: false, code: pending.templateData.code, errorMessage: result.errorMessage };
}

// ---------- Luồng gửi ----------

type RegistrationRow = {
  name: string | null;
  phone: string | null;
  event_slug: string | null;
  event_name: string | null;
  event_time: string | null;
};

type RegistrationContext = { eventId: string; registration: RegistrationRow; settings: SrxLadipageZbsSettings };

/** Lượt đăng ký kèm cấu hình ZBS của sự kiện; null nếu sự kiện không bật ZBS. */
async function loadRegistrationContext(registrationId: string): Promise<RegistrationContext | null> {
  const registrations = await prisma2.$queryRawUnsafe<RegistrationRow[]>(
    `
      SELECT name, phone, event_slug, event_name,
             DATE_FORMAT(COALESCE(submit_time, created_at), '${SQL_TIME_FORMAT}') AS event_time
      FROM checkin
      WHERE id = ?
      LIMIT 1
    `,
    BigInt(registrationId),
  );
  const registration = registrations.at(0);

  if (!registration?.event_slug) {
    return null;
  }

  const events = await prisma2.$queryRawUnsafe<{ id: bigint }[]>(
    "SELECT id FROM ladipage_events WHERE slug = ? LIMIT 1",
    registration.event_slug,
  );
  const eventId = events.at(0)?.id.toString();
  const settings = eventId ? await getSrxLadipageZbsSettings(eventId) : null;

  return eventId && settings?.enabled ? { eventId, registration, settings } : null;
}

/**
 * Gửi ZBS xác nhận cho một lượt đăng ký Ladipage (bảng checkin), nếu sự kiện đang bật ZBS.
 * Gọi lại nhiều lần cho cùng lượt đăng ký cũng chỉ gửi một tin.
 */
export async function sendSrxLadipageRegistrationZbs(registrationId: string): Promise<void> {
  await ensureLadipageZbsTables();

  const context = await loadRegistrationContext(registrationId);

  if (!context) {
    return;
  }

  const { eventId, registration, settings } = context;
  const rawPhone = registration.phone ?? "";
  const phone = normalizeZbsPhone(rawPhone);
  const customerName = (registration.name ?? "").trim();
  const pending = await createPendingLog({
    customerName,
    eventId,
    isTest: false,
    phone: phone || rawPhone.slice(0, 20),
    registrationId,
    templateId: settings.template_id,
    buildTemplateData: (code) =>
      buildSrxLadipageZbsTemplateData({
        code,
        customerName,
        eventFormat: settings.event_format,
        eventLocation: settings.event_location,
        eventName: settings.event_name || (registration.event_name ?? ""),
        eventTime: registration.event_time ?? "",
      }),
  });

  if (!pending) {
    return;
  }

  if (!phone) {
    await finishLog(pending.logId, { status: "failed", errorMessage: "Số điện thoại không hợp lệ để gửi ZBS" });
    return;
  }

  await deliver(pending, phone, settings.template_id);
}

/** Gửi thử theo cấu hình đang lưu của sự kiện, dùng thời gian hiện tại của SQL làm event_time. */
export async function sendSrxLadipageZbsTest(
  eventId: string,
  input: unknown,
): Promise<{ ok: boolean; code: string; errorMessage?: string }> {
  const payload = srxLadipageZbsTestInputSchema.parse(input);
  const phone = normalizeZbsPhone(payload.phone);

  if (!phone) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  const settings = await getSrxLadipageZbsSettings(eventId);

  if (!settings) {
    throw new Error("Hãy lưu cấu hình ZBS trước khi gửi thử");
  }

  const timeRows = await prisma2.$queryRawUnsafe<{ event_time: string }[]>(
    `SELECT DATE_FORMAT(NOW(), '${SQL_TIME_FORMAT}') AS event_time`,
  );
  const pending = await createPendingLog({
    customerName: payload.customer_name,
    eventId,
    isTest: true,
    phone,
    registrationId: null,
    templateId: settings.template_id,
    buildTemplateData: (code) =>
      buildSrxLadipageZbsTemplateData({
        code,
        customerName: payload.customer_name,
        eventFormat: settings.event_format,
        eventLocation: settings.event_location,
        eventName: settings.event_name,
        eventTime: timeRows.at(0)?.event_time ?? "",
      }),
  });

  if (!pending) {
    throw new Error("Không tạo được nhật ký gửi thử");
  }

  return deliver(pending, phone, settings.template_id);
}
