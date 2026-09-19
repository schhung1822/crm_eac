/* eslint-disable max-lines */
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { defaultConfig } from "@/lib/form-template/default-config";
import type { FormTemplateConfig } from "@/lib/form-template/types";
import {
  resolveNullableSiteAssetUrl,
  resolveNullableSiteAssetUrlForStorage,
  resolveSiteAssetUrl,
  resolveSiteAssetUrlForStorage,
} from "@/lib/site-asset-url";
import { getSrxDB } from "@/lib/srx-db";

export const srxLadipageEventStatusValues = ["draft", "published", "archived"] as const;
export type SrxLadipageEventStatus = (typeof srxLadipageEventStatusValues)[number];

/**
 * Trang public do dự án SRX_web render (/events/[slug]). CRM chỉ là bảng điều khiển
 * nên cần biết domain của web để dựng URL tuyệt đối cho nút "Mở trang public".
 * Không fallback sang NEXT_PUBLIC_SITE_URL / SRX_PUBLIC_SITE_URL: đó là domain của chính CRM (crm.srx.vn).
 */
export function resolveSrxLadipageBaseUrl(): string {
  const rawValue =
    (process.env.SRX_EVENT_SITE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SRX_EVENT_SITE_URL ?? "").trim() ||
    "https://srx.vn";

  try {
    return new URL(rawValue).origin;
  } catch {
    return "https://srx.vn";
  }
}

type QueryValue = Date | number | string | null;

type LadipageEventRow = RowDataPacket & {
  id: number | string;
  name: string;
  slug: string;
  event_name: string;
  legacy_template_slug: string | null;
  site_key: string;
  public_base_url: string | null;
  public_path: string | null;
  status: SrxLadipageEventStatus;
  is_active: number | boolean;
  template_style: string;
  sort_order: number;
  config_json: FormTemplateConfig | string | null;
  published_config_json: FormTemplateConfig | string | null;
  published_at: Date | string | null;
  last_synced_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type SrxLadipageEvent = {
  id: string;
  name: string;
  slug: string;
  eventName: string;
  siteKey: string;
  publicBaseUrl: string;
  publicPath: string;
  status: SrxLadipageEventStatus;
  isActive: boolean;
  templateStyle: string;
  sortOrder: number;
  config: FormTemplateConfig;
  publishedConfig: FormTemplateConfig | null;
  /** Bản nháp đang khác bản đã xuất bản — web vẫn hiển thị bản cũ cho tới khi bấm Xuất bản. */
  hasUnpublishedChanges: boolean;
  publishedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeOptionalString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalString(value);
  return trimmed ? trimmed : null;
}

function normalizeTemplateName(name: string, slug: string, config: FormTemplateConfig): string {
  return (
    normalizeOptionalString(name) ||
    normalizeOptionalString(config.behavior.eventName) ||
    normalizeOptionalString(config.header.titleText) ||
    slug
  );
}

function normalizeEventName(name: string, config: FormTemplateConfig): string {
  return normalizeOptionalString(config.behavior.eventName) || normalizeOptionalString(config.header.titleText) || name;
}

function normalizePublicPath(slug: string, publicPath?: string | null): string {
  const trimmed = normalizeOptionalString(publicPath);
  return trimmed || `/events/${slug}`;
}

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toConfig(value: FormTemplateConfig | string | null | undefined): FormTemplateConfig | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as FormTemplateConfig;
  }

  return value;
}

function toJsonString(config: FormTemplateConfig): string {
  return JSON.stringify(config);
}

function normalizeConfigAssetUrls(config: FormTemplateConfig): FormTemplateConfig {
  return {
    ...config,
    header: {
      ...config.header,
      headingImageUrl: resolveSiteAssetUrl(config.header.headingImageUrl),
    },
    infoEvent: {
      ...config.infoEvent,
      logo1Url: resolveNullableSiteAssetUrl(config.infoEvent.logo1Url) ?? undefined,
      logo2Url: resolveNullableSiteAssetUrl(config.infoEvent.logo2Url) ?? undefined,
      logo3Url: resolveNullableSiteAssetUrl(config.infoEvent.logo3Url) ?? undefined,
    },
  };
}

function normalizeConfigAssetUrlsForStorage(config: FormTemplateConfig): FormTemplateConfig {
  return {
    ...config,
    header: {
      ...config.header,
      headingImageUrl: resolveSiteAssetUrlForStorage(config.header.headingImageUrl),
    },
    infoEvent: {
      ...config.infoEvent,
      logo1Url: resolveNullableSiteAssetUrlForStorage(config.infoEvent.logo1Url) ?? undefined,
      logo2Url: resolveNullableSiteAssetUrlForStorage(config.infoEvent.logo2Url) ?? undefined,
      logo3Url: resolveNullableSiteAssetUrlForStorage(config.infoEvent.logo3Url) ?? undefined,
    },
  };
}

function isMissingLadipageEventsTableError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ER_NO_SUCH_TABLE";
}

function wrapMissingLadipageEventsTableError(error: unknown): never {
  if (isMissingLadipageEventsTableError(error)) {
    throw new Error("Thiếu bảng ladipage_events. Hãy import file SQL cho Ladipage Events trước khi sử dụng.");
  }

  throw error;
}

function mapLadipageEvent(row: LadipageEventRow): SrxLadipageEvent {
  const rawConfig = toConfig(row.config_json);
  const rawPublishedConfig = toConfig(row.published_config_json);
  const config = normalizeConfigAssetUrls(rawConfig ?? defaultConfig);
  const publishedConfig = rawPublishedConfig;

  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    eventName: row.event_name,
    siteKey: row.site_key,
    // Không đọc cột public_base_url: các bản ghi cũ đã lưu nhầm domain CRM vào đây.
    publicBaseUrl: resolveSrxLadipageBaseUrl(),
    publicPath: normalizePublicPath(row.slug, row.public_path),
    status: row.status,
    isActive: Boolean(row.is_active),
    templateStyle: row.template_style,
    sortOrder: row.sort_order,
    config,
    publishedConfig: publishedConfig ? normalizeConfigAssetUrls(publishedConfig) : null,
    hasUnpublishedChanges: !rawPublishedConfig || JSON.stringify(rawConfig) !== JSON.stringify(rawPublishedConfig),
    publishedAt: normalizeDate(row.published_at),
    lastSyncedAt: normalizeDate(row.last_synced_at),
    createdAt: normalizeDate(row.created_at) ?? new Date(),
    updatedAt: normalizeDate(row.updated_at) ?? new Date(),
  };
}

async function queryRows<T extends RowDataPacket>(sql: string, values: QueryValue[] = []): Promise<T[]> {
  const [rows] = await getSrxDB().query<T[]>(sql, values);
  return rows;
}

async function queryFirst<T extends RowDataPacket>(sql: string, values: QueryValue[] = []): Promise<T | null> {
  const rows = await queryRows<T>(sql, values);
  return rows[0] ?? null;
}

async function fetchLadipageEventByWhere(
  whereClause: string,
  values: QueryValue[],
  orderClause = "",
): Promise<SrxLadipageEvent | null> {
  try {
    const row = await queryFirst<LadipageEventRow>(
      `SELECT *
       FROM ladipage_events
       WHERE ${whereClause}
       ${orderClause}
       LIMIT 1`,
      values,
    );

    return row ? mapLadipageEvent(row) : null;
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}

async function fetchLadipageEventBySlug(slug: string): Promise<SrxLadipageEvent | null> {
  return fetchLadipageEventByWhere("slug = ?", [slug]);
}

async function fetchLadipageEventById(id: string): Promise<SrxLadipageEvent | null> {
  return fetchLadipageEventByWhere("id = ?", [id]);
}

export async function getSrxLadipageEvents(): Promise<SrxLadipageEvent[]> {
  try {
    const rows = await queryRows<LadipageEventRow>(
      `SELECT *
       FROM ladipage_events
       ORDER BY sort_order ASC, updated_at DESC, created_at DESC`,
    );

    return rows.map((row) => mapLadipageEvent(row));
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}

export async function getSrxLadipageEventById(id: string): Promise<SrxLadipageEvent | null> {
  return fetchLadipageEventById(id);
}

export async function getSrxLadipageEventBySlug(slug: string): Promise<SrxLadipageEvent | null> {
  return fetchLadipageEventBySlug(slug);
}

export async function getActiveSrxLadipageEvent(): Promise<SrxLadipageEvent | null> {
  const activeEvent = await fetchLadipageEventByWhere(
    "is_active = 1 AND status IN ('published', 'draft')",
    [],
    "ORDER BY sort_order ASC, published_at DESC, updated_at DESC",
  );

  if (activeEvent) {
    return activeEvent;
  }

  return fetchLadipageEventByWhere("1 = 1", [], "ORDER BY updated_at DESC");
}

export async function getPublishedSrxLadipageEventBySlug(
  slug: string,
): Promise<{ config: FormTemplateConfig; name: string; slug: string } | null> {
  const ladipageEvent = await fetchLadipageEventByWhere("slug = ? AND is_active = 1 AND status = 'published'", [slug]);

  if (!ladipageEvent) {
    return null;
  }

  return {
    config: ladipageEvent.publishedConfig ?? ladipageEvent.config,
    name: ladipageEvent.name,
    slug: ladipageEvent.slug,
  };
}

export async function ensureDefaultSrxLadipageEvent(): Promise<void> {
  try {
    const totalRow = await queryFirst<RowDataPacket & { total: number }>(
      "SELECT COUNT(*) AS total FROM ladipage_events",
    );

    if ((totalRow?.total ?? 0) > 0) {
      return;
    }

    const now = new Date();
    const slug = "eac-checkin";
    const normalizedDefaultConfig = normalizeConfigAssetUrlsForStorage(defaultConfig);
    const configJson = toJsonString(normalizedDefaultConfig);

    await getSrxDB().query(
      `INSERT INTO ladipage_events (
        name,
        slug,
        event_name,
        site_key,
        public_path,
        status,
        is_active,
        template_style,
        sort_order,
        config_json,
        published_config_json,
        published_at,
        last_synced_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "EAC Check-in",
        slug,
        normalizeEventName("EAC Check-in", normalizedDefaultConfig),
        "srx-event-site",
        `/events/${slug}`,
        "published",
        1,
        normalizedDefaultConfig.templateStyle ?? "default",
        0,
        configJson,
        configJson,
        now,
        now,
        now,
        now,
      ],
    );
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}

async function ensureSlugAvailable(nextSlug: string, currentSlug?: string): Promise<void> {
  const existingNext = await queryFirst<RowDataPacket & { id: number | string }>(
    currentSlug
      ? "SELECT id FROM ladipage_events WHERE slug = ? AND slug <> ? LIMIT 1"
      : "SELECT id FROM ladipage_events WHERE slug = ? LIMIT 1",
    currentSlug ? [nextSlug, currentSlug] : [nextSlug],
  );

  if (existingNext) {
    throw new Error("Slug đã tồn tại");
  }
}

async function insertLadipageEvent(
  slug: string,
  name: string,
  eventName: string,
  config: FormTemplateConfig,
  currentSlug: string,
  publish: boolean,
): Promise<SrxLadipageEvent> {
  const now = new Date();
  const normalizedConfig = normalizeConfigAssetUrlsForStorage(config);
  const configJson = toJsonString(normalizedConfig);

  await getSrxDB().query(
    `INSERT INTO ladipage_events (
      name,
      slug,
      event_name,
      legacy_template_slug,
      site_key,
      public_base_url,
      public_path,
      status,
      is_active,
      template_style,
      sort_order,
      config_json,
      published_config_json,
      published_at,
      last_synced_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      eventName,
      currentSlug || slug,
      "srx-event-site",
      resolveSrxLadipageBaseUrl(),
      `/events/${slug}`,
      publish ? "published" : "draft",
      1,
      normalizedConfig.templateStyle ?? "default",
      0,
      configJson,
      publish ? configJson : null,
      publish ? now : null,
      now,
      now,
      now,
    ],
  );

  const created = await fetchLadipageEventBySlug(slug);

  if (!created) {
    throw new Error("Không thể tạo Ladipage sự kiện");
  }

  return created;
}

async function updateLadipageEvent(
  existingCurrent: SrxLadipageEvent,
  nextSlug: string,
  name: string,
  eventName: string,
  config: FormTemplateConfig,
  publish: boolean,
): Promise<SrxLadipageEvent> {
  const now = new Date();
  const normalizedConfig = normalizeConfigAssetUrlsForStorage(config);
  const configJson = toJsonString(normalizedConfig);
  const currentDefaultPublicPath = `/events/${existingCurrent.slug}`;
  const nextPublicPath =
    !existingCurrent.publicPath || existingCurrent.publicPath === currentDefaultPublicPath
      ? `/events/${nextSlug}`
      : existingCurrent.publicPath;

  // Lưu nháp chỉ ghi config_json; bản public (published_config_json) chỉ đổi khi bấm Xuất bản.
  const publishClause = publish
    ? `,
       published_config_json = ?,
       status = 'published',
       published_at = ?`
    : "";
  const publishValues: QueryValue[] = publish ? [configJson, now] : [];

  await getSrxDB().query(
    `UPDATE ladipage_events
     SET
       name = ?,
       slug = ?,
       event_name = ?,
       legacy_template_slug = ?,
       public_base_url = ?,
       public_path = ?,
       template_style = ?,
       config_json = ?,
       last_synced_at = ?,
       updated_at = ?${publishClause}
     WHERE slug = ?`,
    [
      name,
      nextSlug,
      eventName,
      normalizeNullableString(existingCurrent.slug),
      resolveSrxLadipageBaseUrl(),
      nextPublicPath,
      normalizedConfig.templateStyle ?? "default",
      configJson,
      now,
      now,
      ...publishValues,
      existingCurrent.slug,
    ],
  );

  const updated = await fetchLadipageEventBySlug(nextSlug);

  if (!updated) {
    throw new Error("Không thể cập nhật Ladipage sự kiện");
  }

  return updated;
}

export async function saveSrxLadipageEvent(
  currentSlug: string,
  nextSlug: string,
  name: string,
  config: FormTemplateConfig,
  options: { publish?: boolean } = {},
): Promise<SrxLadipageEvent> {
  try {
    const publish = options.publish ?? false;
    const normalizedNextSlug = normalizeOptionalString(nextSlug);

    if (!normalizedNextSlug) {
      throw new Error("Slug không được để trống");
    }

    const normalizedName = normalizeTemplateName(name, normalizedNextSlug, config);
    const normalizedEventName = normalizeEventName(normalizedName, config);
    const existingCurrent = currentSlug ? await fetchLadipageEventBySlug(currentSlug) : null;

    await ensureSlugAvailable(normalizedNextSlug, existingCurrent?.slug);

    if (!existingCurrent) {
      return insertLadipageEvent(normalizedNextSlug, normalizedName, normalizedEventName, config, currentSlug, publish);
    }

    return updateLadipageEvent(
      existingCurrent,
      normalizedNextSlug,
      normalizedName,
      normalizedEventName,
      config,
      publish,
    );
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}

export type SrxLadipageEventSettingsInput = {
  status?: SrxLadipageEventStatus;
  isActive?: boolean;
  sortOrder?: number;
};

/**
 * Đổi trạng thái hiển thị của một Ladipage mà không đụng tới nội dung.
 * Chuyển sang "published" thì lấy bản nháp hiện tại làm bản public luôn.
 */
export async function updateSrxLadipageEventSettings(
  eventId: string,
  input: SrxLadipageEventSettingsInput,
): Promise<SrxLadipageEvent | null> {
  try {
    const existing = await fetchLadipageEventById(eventId);

    if (!existing) {
      return null;
    }

    const assignments: string[] = [];
    const values: QueryValue[] = [];
    const now = new Date();

    if (input.status !== undefined) {
      assignments.push("status = ?");
      values.push(input.status);

      if (input.status === "published") {
        assignments.push("published_config_json = config_json", "published_at = ?");
        values.push(now);
      }
    }

    if (input.isActive !== undefined) {
      assignments.push("is_active = ?");
      values.push(input.isActive ? 1 : 0);
    }

    if (input.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(input.sortOrder);
    }

    if (assignments.length === 0) {
      return existing;
    }

    assignments.push("updated_at = ?");
    values.push(now, existing.id);

    await getSrxDB().query(`UPDATE ladipage_events SET ${assignments.join(", ")} WHERE id = ?`, values);

    return fetchLadipageEventById(existing.id);
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}

export async function deleteSrxLadipageEvent(eventId: string): Promise<boolean> {
  try {
    const [result] = await getSrxDB().query<ResultSetHeader>("DELETE FROM ladipage_events WHERE id = ? LIMIT 1", [
      eventId,
    ]);
    return result.affectedRows > 0;
  } catch (error) {
    wrapMissingLadipageEventsTableError(error);
  }
}
