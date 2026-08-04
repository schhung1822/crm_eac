import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { getSrxDB } from "@/lib/srx-db";

/**
 * Lượt đăng ký từ Ladipage sự kiện. SRX_web ghi vào bảng `checkin` của database SRX
 * (app/api/events/[slug]/submit): các cột cố định + title_qN/qN theo câu hỏi đang bật
 * + custom_fields_json chứa nhãn/giá trị của trường ẩn và câu hỏi tuỳ chỉnh.
 */
export type SrxLadipageRegistrationField = {
  key: string;
  label: string;
  value: string;
};

export type SrxLadipageRegistration = {
  id: string;
  submittedAt: Date | null;
  name: string;
  phone: string;
  email: string;
  eventName: string;
  eventSlug: string;
  templateStyle: string;
  pageUrl: string;
  voucher: string;
  userId: string;
  /** Câu hỏi tuỳ chỉnh của Ladipage (nhãn lấy theo lúc người dùng gửi form). */
  answers: SrxLadipageRegistrationField[];
  /** Trường ẩn/prefill và các giá trị gửi kèm khác. */
  customFields: SrxLadipageRegistrationField[];
};

type CheckinRow = RowDataPacket & Record<string, unknown>;

/** Cột luôn cố gắng đọc; cột nào chưa có trong bảng thì bỏ qua (bảng cũ chưa migrate). */
const CANDIDATE_COLUMNS = [
  "id",
  "name",
  "phone",
  "email",
  "event_name",
  "event_slug",
  "template_style",
  "site_key",
  "page_url",
  "voucher",
  "user_id",
  "custom_fields_json",
  "submit_time",
  "created_at",
  "title_q1",
  "q1",
  "title_q2",
  "q2",
  "title_q3",
  "q3",
  "title_q4",
  "q4",
  "title_q5",
  "q5",
] as const;

let cachedColumns: string[] | null = null;

function isMissingCheckinTableError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ER_NO_SUCH_TABLE";
}

function wrapMissingCheckinTableError(error: unknown): never {
  if (isMissingCheckinTableError(error)) {
    throw new Error(
      "Thiếu bảng checkin trong database SRX. Hãy import sql/srx_ladipage_events_tables.sql trước khi xem lượt đăng ký.",
    );
  }

  throw error;
}

async function getAvailableColumns(): Promise<string[]> {
  if (cachedColumns) {
    return cachedColumns;
  }

  const [rows] = await getSrxDB().query<Array<RowDataPacket & { column_name: string }>>(
    `SELECT COLUMN_NAME AS column_name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkin'`,
  );

  const existing = new Set(rows.map((row) => String(row.column_name)));
  const columns = CANDIDATE_COLUMNS.filter((column) => existing.has(column));

  if (columns.length === 0) {
    throw Object.assign(new Error("Bảng checkin không tồn tại"), { code: "ER_NO_SUCH_TABLE" });
  }

  cachedColumns = columns;
  return columns;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function asDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type RawCustomFields = {
  hiddenFields?: Record<string, { label?: string; value?: string }>;
  extraValues?: Record<string, string>;
};

function collectLabeledFields(entries: RawCustomFields["hiddenFields"]): SrxLadipageRegistrationField[] {
  return Object.entries(entries ?? {})
    .map(([key, entry]) => ({ key, label: asText(entry.label) || key, value: asText(entry.value) }))
    .filter((field) => field.value !== "");
}

function collectPlainFields(entries: RawCustomFields["extraValues"]): SrxLadipageRegistrationField[] {
  return Object.entries(entries ?? {})
    .map(([key, entry]) => ({ key, label: key, value: asText(entry) }))
    .filter((field) => field.value !== "");
}

function parseCustomFieldsJson(value: unknown): SrxLadipageRegistrationField[] {
  const raw = asText(value);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RawCustomFields;

    return [...collectLabeledFields(parsed.hiddenFields), ...collectPlainFields(parsed.extraValues)];
  } catch {
    return [];
  }
}

function buildAnswers(row: CheckinRow): SrxLadipageRegistrationField[] {
  const answers: SrxLadipageRegistrationField[] = [];

  for (let index = 1; index <= 5; index += 1) {
    const label = asText(row[`title_q${index}`]);
    const value = asText(row[`q${index}`]);

    if (!label && !value) {
      continue;
    }

    answers.push({ key: `q${index}`, label: label || `Câu hỏi ${index}`, value });
  }

  return answers;
}

function mapRegistration(row: CheckinRow): SrxLadipageRegistration {
  return {
    id: asText(row.id),
    submittedAt: asDate(row.submit_time) ?? asDate(row.created_at),
    name: asText(row.name),
    phone: asText(row.phone),
    email: asText(row.email),
    eventName: asText(row.event_name),
    eventSlug: asText(row.event_slug),
    templateStyle: asText(row.template_style),
    pageUrl: asText(row.page_url),
    voucher: asText(row.voucher),
    userId: asText(row.user_id),
    answers: buildAnswers(row),
    customFields: parseCustomFieldsJson(row.custom_fields_json),
  };
}

export async function getSrxLadipageRegistrations(eventSlug?: string): Promise<SrxLadipageRegistration[]> {
  try {
    const columns = await getAvailableColumns();
    const orderColumn = columns.includes("submit_time") ? "submit_time" : "created_at";
    const normalizedSlug = eventSlug?.trim() ?? "";
    const canFilterBySlug = normalizedSlug && columns.includes("event_slug");

    const [rows] = await getSrxDB().query<CheckinRow[]>(
      `SELECT ${columns.map((column) => `\`${column}\``).join(", ")}
       FROM checkin
       ${canFilterBySlug ? "WHERE event_slug = ?" : ""}
       ORDER BY ${columns.includes(orderColumn) ? `\`${orderColumn}\` DESC` : "`id` DESC"}
       LIMIT 5000`,
      canFilterBySlug ? [normalizedSlug] : [],
    );

    return rows.map((row) => mapRegistration(row));
  } catch (error) {
    wrapMissingCheckinTableError(error);
  }
}

/** Số lượt đăng ký theo từng slug Ladipage, để hiển thị ngay trên danh sách Ladipage. */
export async function getSrxLadipageRegistrationCounts(): Promise<Record<string, number>> {
  try {
    const columns = await getAvailableColumns();

    if (!columns.includes("event_slug")) {
      return {};
    }

    const [rows] = await getSrxDB().query<Array<RowDataPacket & { event_slug: string | null; total: number }>>(
      `SELECT event_slug, COUNT(*) AS total
       FROM checkin
       WHERE event_slug IS NOT NULL AND event_slug <> ''
       GROUP BY event_slug`,
    );

    return Object.fromEntries(rows.map((row) => [asText(row.event_slug), Number(row.total ?? 0)]));
  } catch (error) {
    if (isMissingCheckinTableError(error)) {
      return {};
    }

    throw error;
  }
}
