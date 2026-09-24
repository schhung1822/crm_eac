/* eslint-disable max-lines */
import "server-only";

import { createHash } from "node:crypto";

import type { MetaDatasetEventLog, MetaDatasetEventStats, MetaOrderEventName } from "@/lib/meta-conversions.shared";
import { prisma2 } from "@/lib/prisma2";

import { Prisma } from "../../prisma/generated/srx-app-client";

const defaultGraphApiVersion = "v26.0";
const defaultEventSourceUrl = "https://srx.vn/checkout";
const maxDeliveryAttempts = 3;
const staleSendingMinutes = 5;

let ensureEventTablePromise: Promise<void> | null = null;

export type MetaEventSource = {
  source: "crm_order_update" | "ladipage_registration" | "website_checkout";
  sourcePath: string;
};

type MetaOrderLookup = { orderId: string } | { orderNumber: string };

type MetaOrderRecord = Awaited<ReturnType<typeof getMetaOrderRecord>>;

type MetaRegistrationRecord = Awaited<ReturnType<typeof getMetaRegistrationRecord>>;

type MetaDatasetEventPayload = {
  action_source: "website";
  custom_data: Record<string, unknown>;
  event_id: string;
  event_name: MetaOrderEventName;
  event_source_url: string;
  event_time: number;
  user_data: MetaUserData;
};

type MetaEventReference = {
  eventSlug?: string;
  orderId?: bigint;
  orderNumber?: string;
  registrationId?: bigint;
};

type MetaApiResponse = {
  events_received?: number;
  fbtrace_id?: string;
  messages?: string[];
  error?: {
    code?: number;
    message?: string;
    type?: string;
  };
};

type MetaFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type MetaUserData = Record<string, string | string[]>;

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function firstNonEmpty(...values: string[]): string {
  return values.find((value) => value.length > 0) ?? "";
}

function addHashedValue(target: MetaUserData, key: string, value: string, asList = false): void {
  if (value) {
    // The key is an internal Meta field name, never user input.
    // eslint-disable-next-line security/detect-object-injection
    target[key] = asList ? [sha256(value)] : sha256(value);
  }
}

function addPlainValue(target: MetaUserData, key: string, value: string): void {
  if (value) {
    // The key is an internal Meta field name, never user input.
    // eslint-disable-next-line security/detect-object-injection
    target[key] = value;
  }
}

function normalizeEmail(value: string | null): string {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value: string, countryCode: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (countryCode === "vn" && digits.startsWith("0")) {
    digits = `84${digits.slice(1)}`;
  }

  return digits;
}

function normalizeMatchText(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitCustomerName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: normalizeMatchText(parts.at(-1)),
    lastName: normalizeMatchText(parts.slice(0, -1).join(" ")),
  };
}

function isValidMetaCookie(value: string): boolean {
  return /^fb\.\d+\.\d+\.[A-Za-z0-9._-]+$/.test(value);
}

function toUnixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000);
}

function toNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function getMetaConfiguration() {
  const datasetId = normalizeText(process.env.META_DATASET_ID);
  const accessToken = normalizeText(process.env.META_CONVERSIONS_ACCESS_TOKEN);

  if (!datasetId && !accessToken) {
    return null;
  }

  if (!/^\d+$/.test(datasetId)) {
    throw new Error("META_DATASET_ID phải là chuỗi số hợp lệ");
  }

  if (!accessToken) {
    throw new Error("Thiếu META_CONVERSIONS_ACCESS_TOKEN");
  }

  const graphApiVersion = normalizeText(process.env.META_GRAPH_API_VERSION) || defaultGraphApiVersion;

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error("META_GRAPH_API_VERSION không hợp lệ");
  }

  return {
    accessToken,
    datasetId,
    eventSourceUrl: normalizeText(process.env.META_EVENT_SOURCE_URL) || defaultEventSourceUrl,
    graphApiVersion,
    testEventCode: normalizeText(process.env.META_CONVERSIONS_TEST_EVENT_CODE),
  };
}

export async function ensureMetaDatasetEventsTable(): Promise<void> {
  ensureEventTablePromise ??= prisma2
    .$executeRawUnsafe(
      `
        CREATE TABLE IF NOT EXISTS meta_dataset_events (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          order_id BIGINT UNSIGNED NULL,
          order_number VARCHAR(30) NULL,
          registration_id BIGINT UNSIGNED NULL,
          event_slug VARCHAR(180) NULL,
          event_id VARCHAR(190) NOT NULL,
          event_name VARCHAR(64) NOT NULL,
          source VARCHAR(100) NOT NULL,
          source_path VARCHAR(255) NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'pending',
          dataset_id VARCHAR(50) NULL,
          graph_api_version VARCHAR(20) NULL,
          payload_json JSON NOT NULL,
          response_json JSON NULL,
          response_http_status INT NULL,
          meta_trace_id VARCHAR(120) NULL,
          attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
          last_error TEXT NULL,
          last_attempt_at DATETIME NULL,
          sent_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_meta_dataset_events_event_id (event_id),
          KEY idx_meta_dataset_events_order_id (order_id),
          KEY idx_meta_dataset_events_registration_id (registration_id),
          KEY idx_meta_dataset_events_event_slug (event_slug),
          KEY idx_meta_dataset_events_event_name (event_name),
          KEY idx_meta_dataset_events_source (source),
          KEY idx_meta_dataset_events_status (status),
          KEY idx_meta_dataset_events_created_at (created_at),
          CONSTRAINT fk_meta_dataset_events_order
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
    )
    .then(ensureMetaDatasetEventColumns)
    .catch((error: unknown) => {
      ensureEventTablePromise = null;
      throw error;
    });

  await ensureEventTablePromise;
}

type MetaEventColumn = {
  column_name: string;
  is_nullable: "NO" | "YES";
};

type MetaEventIndex = {
  key_name: string;
};

async function ensureMetaDatasetEventColumns(): Promise<void> {
  const columns = await prisma2.$queryRaw<MetaEventColumn[]>(Prisma.sql`
    SELECT COLUMN_NAME AS column_name, IS_NULLABLE AS is_nullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meta_dataset_events'
  `);
  const columnMap = new Map(columns.map((column) => [column.column_name, column]));

  if (!columnMap.has("registration_id")) {
    await prisma2.$executeRawUnsafe(
      "ALTER TABLE meta_dataset_events ADD COLUMN registration_id BIGINT UNSIGNED NULL AFTER order_number",
    );
  }

  if (!columnMap.has("event_slug")) {
    await prisma2.$executeRawUnsafe(
      "ALTER TABLE meta_dataset_events ADD COLUMN event_slug VARCHAR(180) NULL AFTER registration_id",
    );
  }

  if (columnMap.get("order_number")?.is_nullable === "NO") {
    await prisma2.$executeRawUnsafe("ALTER TABLE meta_dataset_events MODIFY COLUMN order_number VARCHAR(30) NULL");
  }

  const indexes = await prisma2.$queryRaw<MetaEventIndex[]>(Prisma.sql`
    SELECT DISTINCT INDEX_NAME AS key_name
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meta_dataset_events'
  `);
  const indexNames = new Set(indexes.map((index) => index.key_name));

  if (!indexNames.has("idx_meta_dataset_events_registration_id")) {
    await prisma2.$executeRawUnsafe(
      "ALTER TABLE meta_dataset_events ADD INDEX idx_meta_dataset_events_registration_id (registration_id)",
    );
  }

  if (!indexNames.has("idx_meta_dataset_events_event_slug")) {
    await prisma2.$executeRawUnsafe(
      "ALTER TABLE meta_dataset_events ADD INDEX idx_meta_dataset_events_event_slug (event_slug)",
    );
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

async function upsertEventLog(
  event: MetaDatasetEventPayload,
  reference: MetaEventReference,
  source: MetaEventSource,
  datasetId: string,
  graphApiVersion: string,
): Promise<void> {
  await ensureMetaDatasetEventsTable();
  await prisma2.$executeRaw(Prisma.sql`
    INSERT INTO meta_dataset_events (
      order_id, order_number, registration_id, event_slug, event_id, event_name, source, source_path,
      status, dataset_id, graph_api_version, payload_json
    ) VALUES (
      ${reference.orderId ?? null}, ${reference.orderNumber ?? null},
      ${reference.registrationId ?? null}, ${reference.eventSlug ?? null},
      ${event.event_id}, ${event.event_name}, ${source.source}, ${source.sourcePath},
      'pending', ${datasetId || null}, ${graphApiVersion || null}, ${stringifyJson(event)}
    )
    ON DUPLICATE KEY UPDATE
      order_id = VALUES(order_id),
      order_number = VALUES(order_number),
      registration_id = VALUES(registration_id),
      event_slug = VALUES(event_slug),
      source = IF(status = 'sent', source, VALUES(source)),
      source_path = IF(status = 'sent', source_path, VALUES(source_path)),
      dataset_id = IF(status = 'sent', dataset_id, VALUES(dataset_id)),
      graph_api_version = IF(status = 'sent', graph_api_version, VALUES(graph_api_version)),
      payload_json = IF(status = 'sent', payload_json, VALUES(payload_json)),
      updated_at = CURRENT_TIMESTAMP
  `);
}

async function updateConfigurationPending(eventId: string, message: string): Promise<void> {
  await prisma2.$executeRaw(Prisma.sql`
    UPDATE meta_dataset_events
    SET status = 'pending', last_error = ${message}, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${eventId} AND status <> 'sent'
  `);
}

async function acquireEventDelivery(eventId: string): Promise<boolean> {
  const affected = await prisma2.$executeRaw(Prisma.sql`
    UPDATE meta_dataset_events
    SET status = 'sending', last_error = NULL, last_attempt_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${eventId}
      AND (
        status IN ('pending', 'failed')
        OR (status = 'sending' AND last_attempt_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${staleSendingMinutes} MINUTE))
      )
  `);

  return affected === 1;
}

async function incrementDeliveryAttempt(eventId: string): Promise<void> {
  await prisma2.$executeRaw(Prisma.sql`
    UPDATE meta_dataset_events
    SET attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${eventId}
  `);
}

async function getEventStatus(eventId: string): Promise<string> {
  const rows = await prisma2.$queryRaw<Array<{ status: string }>>(Prisma.sql`
    SELECT status FROM meta_dataset_events WHERE event_id = ${eventId} LIMIT 1
  `);

  return rows[0]?.status ?? "";
}

async function markEventSent(eventId: string, delivery: MetaDeliveryAttempt): Promise<void> {
  await prisma2.$executeRaw(Prisma.sql`
    UPDATE meta_dataset_events
    SET
      status = 'sent',
      response_json = ${stringifyJson(delivery.response)},
      response_http_status = ${delivery.httpStatus},
      meta_trace_id = ${normalizeText(delivery.response.fbtrace_id)},
      last_error = NULL,
      sent_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${eventId}
  `);
}

async function markEventFailed(eventId: string, delivery: MetaDeliveryAttempt): Promise<void> {
  await prisma2.$executeRaw(Prisma.sql`
    UPDATE meta_dataset_events
    SET
      status = 'failed',
      response_json = ${stringifyJson(delivery.response)},
      response_http_status = ${delivery.httpStatus},
      meta_trace_id = ${normalizeText(delivery.response.fbtrace_id)},
      last_error = ${delivery.error?.message ?? "Không thể gửi sự kiện lên Meta"},
      updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${eventId}
  `);
}

async function getMetaOrderRecord(lookup: MetaOrderLookup) {
  const where =
    "orderId" in lookup
      ? {
          id: BigInt(lookup.orderId),
        }
      : {
          order_number: lookup.orderNumber,
        };

  return prisma2.orders.findUnique({
    where,
    select: {
      id: true,
      order_number: true,
      user_id: true,
      customer_name: true,
      customer_email: true,
      customer_phone: true,
      user_ip: true,
      user_agent: true,
      fbp: true,
      fbc: true,
      grand_total: true,
      placed_at: true,
      paid_at: true,
      completed_at: true,
      updated_at: true,
      order_addresses: {
        where: {
          address_type: "shipping",
        },
        take: 1,
        select: {
          country_code: true,
          province: true,
          district: true,
          postal_code: true,
        },
      },
      order_items: {
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          product_id: true,
          sku: true,
          product_name: true,
          unit_price: true,
          quantity: true,
          line_total: true,
        },
      },
    },
  });
}

type MetaRegistrationRow = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  event_name: string | null;
  event_slug: string | null;
  page_url: string | null;
  user_id: string | null;
  user_ip: string | null;
  user_agent: string | null;
  fbp: string | null;
  fbc: string | null;
  submit_time: Date | null;
  created_at: Date | null;
};

async function getMetaRegistrationRecord(registrationId: string): Promise<MetaRegistrationRow | null> {
  const rows = await prisma2.$queryRaw<MetaRegistrationRow[]>(Prisma.sql`
    SELECT
      id, name, phone, email, event_name, event_slug, page_url, user_id,
      user_ip, user_agent, fbp, fbc, submit_time, created_at
    FROM checkin
    WHERE id = ${BigInt(registrationId)}
    LIMIT 1
  `);

  return rows.at(0) ?? null;
}

function buildUserData(order: NonNullable<MetaOrderRecord>) {
  const address = order.order_addresses.at(0);
  const countryCode = firstNonEmpty(normalizeMatchText(address?.country_code), "vn");
  const email = normalizeEmail(order.customer_email);
  const phone = normalizePhone(order.customer_phone, countryCode);
  const { firstName, lastName } = splitCustomerName(order.customer_name);
  const externalId = order.user_id
    ? `user:${order.user_id.toString()}`
    : `guest:${firstNonEmpty(email, phone, order.id.toString())}`;
  const fbp = normalizeText(order.fbp);
  const fbc = normalizeText(order.fbc);
  const userData: MetaUserData = {
    country: sha256(countryCode),
    external_id: sha256(externalId),
  };

  addHashedValue(userData, "em", email, true);
  addHashedValue(userData, "ph", phone, true);
  addHashedValue(userData, "fn", firstName);
  addHashedValue(userData, "ln", lastName);
  addHashedValue(userData, "ct", normalizeMatchText(address?.district));
  addHashedValue(userData, "st", normalizeMatchText(address?.province));
  addHashedValue(userData, "zp", normalizeMatchText(address?.postal_code));
  addPlainValue(userData, "client_ip_address", normalizeText(order.user_ip));
  addPlainValue(userData, "client_user_agent", normalizeText(order.user_agent));
  addPlainValue(userData, "fbp", isValidMetaCookie(fbp) ? fbp : "");
  addPlainValue(userData, "fbc", isValidMetaCookie(fbc) ? fbc : "");

  return userData;
}

function buildCustomData(order: NonNullable<MetaOrderRecord>) {
  const contents = order.order_items.map((item) => {
    const lineTotal = toNumber(item.line_total);
    const itemPrice = item.quantity > 0 ? lineTotal / item.quantity : toNumber(item.unit_price);
    const sku = normalizeText(item.sku);

    return {
      id: item.product_id?.toString() ?? firstNonEmpty(sku, item.id.toString()),
      item_price: itemPrice,
      quantity: item.quantity,
    };
  });

  return {
    content_ids: contents.map((item) => item.id),
    content_name: `Đơn hàng ${order.order_number}`,
    content_type: "product",
    contents,
    currency: "VND",
    num_items: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    order_id: order.order_number,
    value: toNumber(order.grand_total),
  };
}

function buildRegistrationUserData(registration: NonNullable<MetaRegistrationRecord>): MetaUserData {
  const email = normalizeEmail(registration.email);
  const phone = normalizePhone(normalizeText(registration.phone), "vn");
  const { firstName, lastName } = splitCustomerName(normalizeText(registration.name));
  const externalId = normalizeText(registration.user_id) || `registration:${registration.id}`;
  const fbp = normalizeText(registration.fbp);
  const fbc = normalizeText(registration.fbc);
  const userData: MetaUserData = {
    country: sha256("vn"),
    external_id: sha256(externalId),
  };

  addHashedValue(userData, "em", email, true);
  addHashedValue(userData, "ph", phone, true);
  addHashedValue(userData, "fn", firstName);
  addHashedValue(userData, "ln", lastName);
  addPlainValue(userData, "client_ip_address", normalizeText(registration.user_ip));
  addPlainValue(userData, "client_user_agent", normalizeText(registration.user_agent));
  addPlainValue(userData, "fbp", isValidMetaCookie(fbp) ? fbp : "");
  addPlainValue(userData, "fbc", isValidMetaCookie(fbc) ? fbc : "");

  return userData;
}

function buildMetaRegistrationEvent(
  registration: NonNullable<MetaRegistrationRecord>,
  fallbackEventSourceUrl: string,
): MetaDatasetEventPayload {
  const eventSlug = normalizeText(registration.event_slug);
  const eventName = normalizeText(registration.event_name) || eventSlug || "Đăng ký sự kiện SRX";
  const eventSourceUrl = normalizeText(registration.page_url) || fallbackEventSourceUrl;
  const eventTime = registration.submit_time ?? registration.created_at ?? new Date();

  return {
    action_source: "website",
    custom_data: {
      content_category: "Ladipage registration",
      content_ids: eventSlug ? [eventSlug] : [],
      content_name: eventName,
      content_type: "product",
    },
    event_id: `event-registration-${registration.id}`,
    event_name: "CompleteRegistration",
    event_source_url: eventSourceUrl,
    event_time: toUnixSeconds(eventTime),
    user_data: buildRegistrationUserData(registration),
  };
}

export function buildMetaOrderEvent(
  eventName: MetaOrderEventName,
  order: NonNullable<MetaOrderRecord>,
  eventSourceUrl = defaultEventSourceUrl,
): MetaDatasetEventPayload {
  const eventTime =
    eventName === "Purchase" ? (order.paid_at ?? order.completed_at ?? order.updated_at) : order.placed_at;

  return {
    action_source: "website",
    custom_data: buildCustomData(order),
    event_id: `srx-order-${order.id.toString()}-${eventName.toLowerCase()}`,
    event_name: eventName,
    event_source_url: eventSourceUrl,
    event_time: toUnixSeconds(eventTime),
    user_data: buildUserData(order),
  };
}

function shouldRetry(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}

async function waitBeforeRetry(attempt: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
}

type MetaConfiguration = NonNullable<ReturnType<typeof getMetaConfiguration>>;

type MetaDeliveryAttempt = {
  delivered: boolean;
  error: Error | null;
  httpStatus: number | null;
  response: MetaApiResponse;
  retry: boolean;
};

async function deliverMetaEvent(
  eventName: MetaOrderEventName,
  config: MetaConfiguration,
  body: object,
  fetchImpl: MetaFetch,
): Promise<MetaDeliveryAttempt> {
  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${config.graphApiVersion}/${config.datasetId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(7000),
      },
    );
    const result = (await response.json().catch(() => ({}))) as MetaApiResponse;

    if (response.ok && result.events_received === 1) {
      return { delivered: true, error: null, httpStatus: response.status, response: result, retry: false };
    }

    const errorCode = result.error?.code;
    const codeSuffix = errorCode ? `, Meta code ${errorCode}` : "";

    return {
      delivered: false,
      error: new Error(`Meta Conversions API từ chối ${eventName} (HTTP ${response.status}${codeSuffix})`),
      httpStatus: response.status,
      response: result,
      retry: shouldRetry(response),
    };
  } catch (error) {
    return {
      delivered: false,
      error: error instanceof Error ? error : new Error(`Không thể gửi sự kiện ${eventName} lên Meta`),
      httpStatus: null,
      response: {},
      retry: true,
    };
  }
}

// eslint-disable-next-line complexity
async function sendTrackedMetaEvent(
  event: MetaDatasetEventPayload,
  reference: MetaEventReference,
  source: MetaEventSource,
  fetchImpl: MetaFetch,
): Promise<boolean> {
  const rawDatasetId = normalizeText(process.env.META_DATASET_ID);
  const rawGraphVersion = normalizeText(process.env.META_GRAPH_API_VERSION) || defaultGraphApiVersion;

  await upsertEventLog(event, reference, source, rawDatasetId, rawGraphVersion);

  let config: ReturnType<typeof getMetaConfiguration>;

  try {
    config = getMetaConfiguration();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cấu hình Meta Conversions API không hợp lệ";
    await updateConfigurationPending(event.event_id, message);
    return false;
  }

  if (!config) {
    await updateConfigurationPending(event.event_id, "Chưa cấu hình META_DATASET_ID và META_CONVERSIONS_ACCESS_TOKEN");
    return false;
  }

  const acquired = await acquireEventDelivery(event.event_id);

  if (!acquired) {
    return (await getEventStatus(event.event_id)) === "sent";
  }

  const body = {
    data: [event],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };
  let lastDelivery: MetaDeliveryAttempt | null = null;

  for (let attempt = 0; attempt < maxDeliveryAttempts; attempt += 1) {
    await incrementDeliveryAttempt(event.event_id);
    const delivery = await deliverMetaEvent(event.event_name, config, body, fetchImpl);
    lastDelivery = delivery;

    if (delivery.delivered) {
      await markEventSent(event.event_id, delivery);
      return true;
    }

    if (!delivery.retry) {
      break;
    }

    if (attempt < maxDeliveryAttempts - 1) {
      await waitBeforeRetry(attempt);
    }
  }

  const failedDelivery =
    lastDelivery ??
    ({
      delivered: false,
      error: new Error(`Không thể gửi sự kiện ${event.event_name} lên Meta`),
      httpStatus: null,
      response: {},
      retry: false,
    } satisfies MetaDeliveryAttempt);
  await markEventFailed(event.event_id, failedDelivery);
  throw failedDelivery.error ?? new Error(`Không thể gửi sự kiện ${event.event_name} lên Meta`);
}

export async function sendMetaOrderEvent(
  eventName: MetaOrderEventName,
  lookup: MetaOrderLookup,
  {
    fetchImpl = fetch,
    source,
  }: {
    fetchImpl?: MetaFetch;
    source: MetaEventSource;
  },
): Promise<boolean> {
  const order = await getMetaOrderRecord(lookup);

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng để gửi Meta Conversions API");
  }

  const fallbackSourceUrl = normalizeText(process.env.META_EVENT_SOURCE_URL) || defaultEventSourceUrl;
  const event = buildMetaOrderEvent(eventName, order, fallbackSourceUrl);

  return sendTrackedMetaEvent(
    event,
    {
      orderId: order.id,
      orderNumber: order.order_number,
    },
    source,
    fetchImpl,
  );
}

export function sendCompleteRegistrationForOrder(
  orderNumber: string,
  source: MetaEventSource = {
    source: "website_checkout",
    sourcePath: "/api/srx/orders_web",
  },
): Promise<boolean> {
  return sendMetaOrderEvent("CompleteRegistration", { orderNumber }, { source });
}

export function sendPurchaseForOrder(
  orderId: string,
  source: MetaEventSource = {
    source: "crm_order_update",
    sourcePath: "/api/srx/orders/[orderId]",
  },
): Promise<boolean> {
  return sendMetaOrderEvent("Purchase", { orderId }, { source });
}

export async function sendCompleteRegistrationForLadipage(
  registrationId: string,
  source?: MetaEventSource,
): Promise<boolean> {
  const registration = await getMetaRegistrationRecord(registrationId);

  if (!registration) {
    throw new Error("Không tìm thấy lượt đăng ký Ladipage để gửi Meta Conversions API");
  }

  const fallbackSourceUrl = normalizeText(process.env.META_EVENT_SOURCE_URL) || defaultEventSourceUrl;
  const event = buildMetaRegistrationEvent(registration, fallbackSourceUrl);
  const eventSlug = normalizeText(registration.event_slug);
  const resolvedSource =
    source ??
    ({
      source: "ladipage_registration",
      sourcePath: eventSlug ? `/api/events/${eventSlug}/submit` : "/api/events/[slug]/submit",
    } satisfies MetaEventSource);

  return sendTrackedMetaEvent(
    event,
    {
      eventSlug,
      registrationId: BigInt(registration.id),
    },
    resolvedSource,
    fetch,
  );
}

type MetaDatasetEventRow = {
  id: bigint;
  order_id: bigint | null;
  order_number: string | null;
  registration_id: bigint | null;
  event_slug: string | null;
  event_id: string;
  event_name: string;
  source: string;
  source_path: string | null;
  status: string;
  dataset_id: string | null;
  graph_api_version: string | null;
  payload_json: unknown;
  response_json: unknown;
  response_http_status: number | null;
  meta_trace_id: string | null;
  attempt_count: number;
  last_error: string | null;
  last_attempt_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function isMetaOrderEventName(value: string): value is MetaOrderEventName {
  return value === "CompleteRegistration" || value === "Purchase";
}

function mapEventLog(row: MetaDatasetEventRow): MetaDatasetEventLog {
  return {
    id: row.id.toString(),
    order_id: row.order_id?.toString() ?? "",
    order_number: normalizeText(row.order_number),
    registration_id: row.registration_id?.toString() ?? "",
    event_slug: normalizeText(row.event_slug),
    event_id: row.event_id,
    event_name: isMetaOrderEventName(row.event_name) ? row.event_name : "CompleteRegistration",
    source: row.source,
    source_path: normalizeText(row.source_path),
    status: row.status,
    dataset_id: normalizeText(row.dataset_id),
    graph_api_version: normalizeText(row.graph_api_version),
    payload: parseJson(row.payload_json),
    response: parseJson(row.response_json),
    response_http_status: row.response_http_status,
    meta_trace_id: normalizeText(row.meta_trace_id),
    attempt_count: row.attempt_count,
    last_error: normalizeText(row.last_error),
    last_attempt_at: row.last_attempt_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getMetaDatasetEventLogs(limit = 500): Promise<MetaDatasetEventLog[]> {
  await ensureMetaDatasetEventsTable();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const rows = await prisma2.$queryRaw<MetaDatasetEventRow[]>(Prisma.sql`
    SELECT
      id, order_id, order_number, registration_id, event_slug,
      event_id, event_name, source, source_path, status,
      dataset_id, graph_api_version, payload_json, response_json, response_http_status,
      meta_trace_id, attempt_count, last_error, last_attempt_at, sent_at, created_at, updated_at
    FROM meta_dataset_events
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeLimit}
  `);

  return rows.map(mapEventLog);
}

export async function getMetaDatasetEventStats(): Promise<MetaDatasetEventStats> {
  await ensureMetaDatasetEventsTable();
  const rows = await prisma2.$queryRaw<
    Array<{
      total: bigint | null;
      sent: bigint | null;
      failed: bigint | null;
      pending: bigint | null;
      sending: bigint | null;
      complete_registration: bigint | null;
      ladipage_registrations: bigint | null;
      purchase: bigint | null;
      last_24_hours: bigint | null;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'sent') AS sent,
      SUM(status = 'failed') AS failed,
      SUM(status = 'pending') AS pending,
      SUM(status = 'sending') AS sending,
      SUM(event_name = 'CompleteRegistration') AS complete_registration,
      SUM(source = 'ladipage_registration') AS ladipage_registrations,
      SUM(event_name = 'Purchase') AS purchase,
      SUM(created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)) AS last_24_hours
    FROM meta_dataset_events
  `);
  const stats = rows[0];
  const toCount = (value: bigint | null) => Number(value ?? BigInt(0));

  return {
    total: toCount(stats.total),
    sent: toCount(stats.sent),
    failed: toCount(stats.failed),
    pending: toCount(stats.pending),
    sending: toCount(stats.sending),
    completeRegistration: toCount(stats.complete_registration),
    ladipageRegistrations: toCount(stats.ladipage_registrations),
    purchase: toCount(stats.purchase),
    last24Hours: toCount(stats.last_24_hours),
  };
}

export async function retryMetaDatasetEvent(logId: string): Promise<boolean> {
  await ensureMetaDatasetEventsTable();
  const rows = await prisma2.$queryRaw<
    Array<{
      event_name: string;
      order_id: bigint | null;
      order_number: string | null;
      registration_id: bigint | null;
      source: string;
      source_path: string | null;
    }>
  >(Prisma.sql`
    SELECT event_name, order_id, order_number, registration_id, source, source_path
    FROM meta_dataset_events
    WHERE id = ${BigInt(logId)}
    LIMIT 1
  `);
  const event = rows.at(0);

  if (!event || !isMetaOrderEventName(event.event_name)) {
    throw new Error("Không tìm thấy sự kiện Meta hợp lệ");
  }

  const source: MetaEventSource = {
    source:
      event.source === "website_checkout"
        ? "website_checkout"
        : event.source === "ladipage_registration"
          ? "ladipage_registration"
          : "crm_order_update",
    sourcePath: firstNonEmpty(normalizeText(event.source_path), "/srx/meta-events"),
  };

  if (event.registration_id) {
    return sendCompleteRegistrationForLadipage(event.registration_id.toString(), source);
  }

  if (!event.order_id && !event.order_number) {
    throw new Error("Sự kiện Meta không có dữ liệu tham chiếu để gửi lại");
  }

  const lookup: MetaOrderLookup = event.order_id
    ? { orderId: event.order_id.toString() }
    : { orderNumber: event.order_number ?? "" };

  return sendMetaOrderEvent(event.event_name, lookup, { source });
}
