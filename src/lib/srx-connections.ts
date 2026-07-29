/* eslint-disable complexity, max-lines */

import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import {
  getSrxConnectionDefinition,
  srxConnectionCatalog,
  type SrxConnectionId,
  type SrxConnectionState,
  type SrxConnectionStatus,
} from "@/lib/srx-connections.shared";

/**
 * Secret của từng kết nối lưu trong bảng `token` (một dòng cấu hình duy nhất).
 * Tên cột là hằng số trong file này, không lấy từ input người dùng.
 */
const secretColumns: Partial<Record<SrxConnectionId, string>> = {
  claude: "anthropic_api_key",
  chatgpt: "openai_api_key",
  gemini: "gemini_api_key",
  deepseek: "deepseek_api_key",
  "google-drive": "google_drive_credential",
  facebook: "facebook_page_token",
};

type TokenSecretRow = Record<string, string | null> & { id: number };

async function readTokenSecretRow(): Promise<TokenSecretRow | null> {
  const columns = Object.values(secretColumns).join(", ");

  try {
    const rows = await prisma.$queryRawUnsafe<TokenSecretRow[]>(
      `SELECT id, ${columns} FROM token ORDER BY id ASC LIMIT 1`,
    );

    return rows[0] ?? null;
  } catch (error) {
    console.error("Không đọc được API key từ bảng token:", error);
    return null;
  }
}

async function writeTokenSecret(id: SrxConnectionId, encrypted: string | null): Promise<void> {
  const column = secretColumns[id];

  if (!column) {
    return;
  }

  const row = await readTokenSecretRow();

  if (row) {
    await prisma.$executeRawUnsafe(
      `UPDATE token SET ${column} = ?, updated_at = NOW() WHERE id = ?`,
      encrypted,
      row.id,
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO token (${column}, created_at, updated_at) VALUES (?, NOW(), NOW())`,
    encrypted,
  );
}

const dataDirectory = path.join(process.cwd(), ".data");
const storePath = path.join(dataDirectory, "srx-connections.json");
const keyPath = path.join(dataDirectory, "srx-connections.key");

// File cấu hình cũ, chỉ đọc một lần để migrate sang store mới.
const legacyAiSettingsPath = path.join(dataDirectory, "srx-ai-settings.json");
const legacySocialSettingsPath = path.join(dataDirectory, "srx-social-settings.json");

const ENCRYPTION_PREFIX = "v1";
const KEY_SALT = "srx-connections-aes-256-gcm";

type StoredConnection = {
  secret: string | null;
  values: Record<string, string>;
  status: SrxConnectionStatus;
  statusMessage: string;
  checkedAt: string | null;
  updatedAt: string | null;
};

type ConnectionStore = {
  version: 1;
  connections: Partial<Record<SrxConnectionId, StoredConnection>>;
};

let cachedKey: Buffer | null = null;

async function ensureDataDirectory(): Promise<void> {
  if (!existsSync(dataDirectory)) {
    await mkdir(dataDirectory, { recursive: true });
  }
}

/**
 * Khoá mã hoá lấy theo thứ tự: SRX_CONNECTIONS_SECRET -> JWT_SECRET -> khoá ngẫu nhiên
 * sinh một lần và lưu tại .data/srx-connections.key.
 */
async function getEncryptionKey(): Promise<Buffer> {
  if (cachedKey) {
    return cachedKey;
  }

  const envSecret = process.env.SRX_CONNECTIONS_SECRET?.trim() ?? process.env.JWT_SECRET?.trim() ?? "";

  if (envSecret) {
    cachedKey = scryptSync(envSecret, KEY_SALT, 32);
    return cachedKey;
  }

  await ensureDataDirectory();

  try {
    const stored = (await readFile(keyPath, "utf8")).trim();

    if (stored) {
      cachedKey = Buffer.from(stored, "base64");
      return cachedKey;
    }
  } catch {
    // Chưa có khoá, sinh mới bên dưới.
  }

  const generated = randomBytes(32);
  await writeFile(keyPath, generated.toString("base64"), { encoding: "utf8", mode: 0o600 });
  cachedKey = generated;

  return cachedKey;
}

async function encryptSecret(value: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [ENCRYPTION_PREFIX, iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

async function decryptSecret(value: string | null): Promise<string> {
  if (!value) {
    return "";
  }

  const parts = value.split(":");

  if (parts.length !== 4 || parts[0] !== ENCRYPTION_PREFIX) {
    return "";
  }

  try {
    const key = await getEncryptionKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));

    return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Khoá đổi hoặc dữ liệu hỏng — coi như chưa cấu hình.
    return "";
  }
}

function createEmptyConnection(): StoredConnection {
  return {
    secret: null,
    values: {},
    status: "unknown",
    statusMessage: "",
    checkedAt: null,
    updatedAt: null,
  };
}

function normalizeValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") {
      result[key] = item;
    }
  }

  return result;
}

function normalizeStore(value: unknown): ConnectionStore {
  const raw = (value ?? {}) as Partial<ConnectionStore>;
  const connections: ConnectionStore["connections"] = {};

  for (const definition of srxConnectionCatalog) {
    const stored = raw.connections?.[definition.id];

    if (!stored) {
      continue;
    }

    connections[definition.id] = {
      secret: typeof stored.secret === "string" ? stored.secret : null,
      values: normalizeValues(stored.values),
      status: stored.status === "ok" || stored.status === "error" ? stored.status : "unknown",
      statusMessage: typeof stored.statusMessage === "string" ? stored.statusMessage : "",
      checkedAt: typeof stored.checkedAt === "string" ? stored.checkedAt : null,
      updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : null,
    };
  }

  return { version: 1, connections };
}

async function readLegacyJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Chuyển cấu hình từ .data/srx-ai-settings.json và .data/srx-social-settings.json
 * sang store mới. Chỉ chạy khi store chưa tồn tại.
 */
async function buildMigratedStore(): Promise<ConnectionStore> {
  const store: ConnectionStore = { version: 1, connections: {} };
  const now = new Date().toISOString();

  const legacyAi = await readLegacyJson(legacyAiSettingsPath);
  const legacySocial = await readLegacyJson(legacySocialSettingsPath);

  const openai = (legacyAi?.openai ?? null) as Record<string, unknown> | null;
  const gemini = (legacyAi?.gemini ?? null) as Record<string, unknown> | null;

  if (openai) {
    store.connections.chatgpt = {
      ...createEmptyConnection(),
      secret: asString(openai.apiKey) ? await encryptSecret(asString(openai.apiKey)) : null,
      values: {
        model: asString(openai.defaultModelId),
        baseUrl: asString(openai.baseUrl),
        projectId: asString(openai.projectId),
      },
      updatedAt: now,
    };
  }

  if (gemini) {
    store.connections.gemini = {
      ...createEmptyConnection(),
      secret: asString(gemini.apiKey) ? await encryptSecret(asString(gemini.apiKey)) : null,
      values: {
        model: asString(gemini.defaultModelId),
        baseUrl: asString(gemini.baseUrl),
      },
      updatedAt: now,
    };
  }

  if (legacySocial) {
    store.connections.facebook = {
      ...createEmptyConnection(),
      secret: asString(legacySocial.facebookPageAccessToken)
        ? await encryptSecret(asString(legacySocial.facebookPageAccessToken))
        : null,
      values: {
        pageId: asString(legacySocial.facebookPageId),
        graphApiVersion: asString(legacySocial.facebookGraphApiVersion),
        schedulerLimit: asString(legacySocial.schedulerLimit),
      },
      updatedAt: now,
    };

    store.connections.zalo = {
      ...createEmptyConnection(),
      values: {
        articleAuthor: asString(legacySocial.zaloArticleAuthor),
        articleCreateUrl: asString(legacySocial.zaloArticleCreateUrl),
        articleUpdateUrl: asString(legacySocial.zaloArticleUpdateUrl),
        articleDeleteUrl: asString(legacySocial.zaloArticleDeleteUrl),
        articleListUrl: asString(legacySocial.zaloArticleListUrl),
      },
      updatedAt: now,
    };
  }

  return store;
}

async function readStore(): Promise<ConnectionStore> {
  let store: ConnectionStore | null = null;

  try {
    store = normalizeStore(JSON.parse(await readFile(storePath, "utf8")));
  } catch {
    store = null;
  }

  const migrated = await buildMigratedStore();

  if (!store) {
    if (Object.keys(migrated.connections).length > 0) {
      await writeStore(migrated);
    }

    return migrated;
  }

  // Bổ sung lại cấu hình (không phải secret) từ file đời đầu nếu store bị thiếu.
  for (const [id, value] of Object.entries(migrated.connections) as Array<[SrxConnectionId, StoredConnection]>) {
    store.connections[id] ??= { ...value, secret: null };
  }

  return store;
}

// Nhiều kết nối được xử lý song song nên phải nối tiếp read-modify-write,
// nếu không các lần ghi sẽ đè lên nhau và làm mất cấu hình.
let storeWriteQueue: Promise<unknown> = Promise.resolve();

async function writeStore(store: ConnectionStore): Promise<void> {
  await ensureDataDirectory();
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

/** Đọc store, sửa, rồi ghi lại — đảm bảo không có hai lượt chạy chồng nhau. */
async function updateStore<T>(mutate: (store: ConnectionStore) => T | Promise<T>): Promise<T> {
  const run = storeWriteQueue.then(async () => {
    const store = await readStore();
    const result = await mutate(store);
    await writeStore(store);

    return result;
  });

  storeWriteQueue = run.catch(() => undefined);

  return run;
}

function maskSecret(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "••••••••";
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function readEnvSecret(id: SrxConnectionId): string {
  const definition = getSrxConnectionDefinition(id);

  if (!definition?.envKey) {
    return "";
  }

  return process.env[definition.envKey]?.trim() ?? "";
}

/** Đọc secret đã mã hoá của một kết nối từ bảng token. Chỉ đọc, không ghi. */
function readStoredSecret(id: SrxConnectionId, row: TokenSecretRow | null): string | null {
  const column = secretColumns[id];

  return column ? (row?.[column] ?? null) : null;
}

/** Secret dạng plaintext còn sót trong các file cấu hình đời đầu. */
async function readLegacyPlaintextSecret(id: SrxConnectionId): Promise<string> {
  if (id === "chatgpt" || id === "gemini") {
    const legacy = await readLegacyJson(legacyAiSettingsPath);
    const provider = (legacy?.[id === "chatgpt" ? "openai" : "gemini"] ?? null) as Record<string, unknown> | null;

    return asString(provider?.apiKey).trim();
  }

  if (id === "facebook") {
    const legacy = await readLegacyJson(legacySocialSettingsPath);

    return asString(legacy?.facebookPageAccessToken).trim();
  }

  return "";
}

let migrationPromise: Promise<void> | null = null;

/**
 * Đưa secret còn nằm ở file (dạng đã mã hoá trong store, hoặc plaintext trong file
 * cấu hình đời đầu) vào bảng token. Chạy một lượt duy nhất cho mỗi tiến trình.
 */
async function migrateSecretsToDatabase(): Promise<void> {
  migrationPromise ??= (async () => {
    try {
      const row = await readTokenSecretRow();
      const store = await readStore();
      const pending: Array<{ id: SrxConnectionId; encrypted: string }> = [];

      for (const [id, column] of Object.entries(secretColumns) as Array<[SrxConnectionId, string]>) {
        // eslint-disable-next-line security/detect-object-injection
        if (row?.[column]) {
          continue;
        }

        const fromStore = store.connections[id]?.secret ?? null;

        if (fromStore) {
          pending.push({ id, encrypted: fromStore });
          continue;
        }

        const plaintext = await readLegacyPlaintextSecret(id);

        if (plaintext) {
          pending.push({ id, encrypted: await encryptSecret(plaintext) });
        }
      }

      for (const item of pending) {
        await writeTokenSecret(item.id, item.encrypted);
      }

      if (pending.length > 0) {
        await updateStore((current) => {
          for (const item of pending) {
            const existing = current.connections[item.id];

            if (existing) {
              existing.secret = null;
            }
          }
        });
      }
    } catch (error) {
      console.error("Không chuyển được API key sang bảng token:", error);
    }
  })();

  return migrationPromise;
}

/** Lấy secret đã giải mã để dùng phía server (ưu tiên biến môi trường). */
export async function getSrxConnectionSecret(id: SrxConnectionId): Promise<string> {
  const envSecret = readEnvSecret(id);

  if (envSecret) {
    return envSecret;
  }

  await migrateSecretsToDatabase();

  const row = await readTokenSecretRow();

  return decryptSecret(readStoredSecret(id, row));
}

export async function getSrxConnectionValues(id: SrxConnectionId): Promise<Record<string, string>> {
  const store = await readStore();

  return store.connections[id]?.values ?? {};
}

/**
 * Secret chạy cron đăng bài không phải là một kết nối bên thứ ba nên không hiển thị
 * trong giao diện. Ưu tiên biến môi trường, giữ file cũ làm fallback để không mất cấu hình.
 */
export async function getSrxSchedulerSecret(): Promise<string> {
  const fromEnv = process.env.SRX_SOCIAL_SCHEDULER_SECRET?.trim() ?? process.env.CRON_SECRET?.trim() ?? "";

  if (fromEnv) {
    return fromEnv;
  }

  const legacy = await readLegacyJson(legacySocialSettingsPath);

  return asString(legacy?.schedulerSecret).trim();
}

async function toConnectionState(
  id: SrxConnectionId,
  stored: StoredConnection | undefined,
  row: TokenSecretRow | null,
): Promise<SrxConnectionState> {
  const definition = getSrxConnectionDefinition(id);
  const envSecret = readEnvSecret(id);
  const storedSecret = await decryptSecret(readStoredSecret(id, row));
  const effectiveSecret = envSecret || storedSecret;
  const hasSecret = Boolean(effectiveSecret);
  const values = stored?.values ?? {};
  const hasValues = Object.values(values).some((value) => value.trim().length > 0);

  return {
    id,
    // Zalo không có secret nhập tay nên chỉ cần có cấu hình là coi như đã kết nối.
    connected: definition?.secret ? hasSecret : hasValues,
    hasSecret,
    secretPreview: maskSecret(effectiveSecret),
    secretFromEnv: Boolean(envSecret),
    values,
    status: stored?.status ?? "unknown",
    statusMessage: stored?.statusMessage ?? "",
    checkedAt: stored?.checkedAt ?? null,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export async function getSrxConnectionStates(): Promise<SrxConnectionState[]> {
  await migrateSecretsToDatabase();

  const store = await readStore();
  const row = await readTokenSecretRow();

  return Promise.all(srxConnectionCatalog.map((item) => toConnectionState(item.id, store.connections[item.id], row)));
}

export async function saveSrxConnection({
  id,
  secret,
  values,
}: {
  id: SrxConnectionId;
  /** undefined = giữ nguyên secret cũ, "" = xoá secret. */
  secret?: string;
  values: Record<string, string>;
}): Promise<SrxConnectionState> {
  if (secret !== undefined) {
    const trimmed = secret.trim();
    await writeTokenSecret(id, trimmed ? await encryptSecret(trimmed) : null);
  }

  const next = await updateStore((store) => {
    const current = store.connections[id] ?? createEmptyConnection();
    const value: StoredConnection = {
      ...current,
      // Secret nằm trong bảng token, file chỉ giữ cấu hình không bí mật.
      secret: null,
      values: normalizeValues(values),
      // Đổi cấu hình thì trạng thái kiểm tra cũ không còn giá trị.
      status: "unknown",
      statusMessage: "",
      checkedAt: null,
      updatedAt: new Date().toISOString(),
    };

    store.connections[id] = value;

    return value;
  });

  return toConnectionState(id, next, await readTokenSecretRow());
}

export async function deleteSrxConnection(id: SrxConnectionId): Promise<void> {
  await writeTokenSecret(id, null);
  await updateStore((store) => {
    delete store.connections[id];
  });
}

/* ------------------------------------------------------------------ */
/* Kiểm tra kết nối                                                    */
/* ------------------------------------------------------------------ */

type TestResult = { ok: boolean; message: string };

const TEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function describeHttpError(response: Response, fallback: string): Promise<string> {
  const body = await response.text().catch(() => "");

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const message = typeof parsed.error === "string" ? parsed.error : (parsed.error?.message ?? parsed.message ?? "");

    if (message) {
      return `${response.status} — ${message}`;
    }
  } catch {
    // Không phải JSON, dùng nguyên văn bên dưới.
  }

  return body ? `${response.status} — ${body.slice(0, 180)}` : `${response.status} — ${fallback}`;
}

async function testClaude(secret: string, values: Record<string, string>): Promise<TestResult> {
  const baseUrl = (values.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/v1/models?limit=1`, {
    headers: { "x-api-key": secret, "anthropic-version": "2023-06-01" },
  });

  if (!response.ok) {
    return { ok: false, message: await describeHttpError(response, "Anthropic từ chối request") };
  }

  return { ok: true, message: "API key Anthropic hợp lệ" };
}

async function testOpenAiCompatible(
  secret: string,
  values: Record<string, string>,
  { defaultBaseUrl, label }: { defaultBaseUrl: string; label: string },
): Promise<TestResult> {
  const baseUrl = (values.baseUrl || defaultBaseUrl).replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    return { ok: false, message: await describeHttpError(response, `${label} từ chối request`) };
  }

  return { ok: true, message: `API key ${label} hợp lệ` };
}

async function testGemini(secret: string, values: Record<string, string>): Promise<TestResult> {
  const baseUrl = (values.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/models?pageSize=1&key=${encodeURIComponent(secret)}`, {
    method: "GET",
  });

  if (!response.ok) {
    return { ok: false, message: await describeHttpError(response, "Google từ chối request") };
  }

  return { ok: true, message: "API key Gemini hợp lệ" };
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Đổi service account JSON lấy access token theo luồng JWT bearer của Google. */
async function getGoogleAccessToken(serviceAccountJson: string, scope: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  };

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("Service account JSON thiếu client_email hoặc private_key");
  }

  const tokenUri = credentials.token_uri ?? "https://oauth2.googleapis.com/token";
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope,
      aud: tokenUri,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();

  const signature = base64Url(signer.sign(credentials.private_key.replace(/\\n/g, "\n")));
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetchWithTimeout(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(await describeHttpError(response, "Google từ chối cấp token"));
  }

  const result = (await response.json()) as { access_token?: string };

  if (!result.access_token) {
    throw new Error("Google không trả về access_token");
  }

  return result.access_token;
}

async function testGoogleDrive(secret: string, values: Record<string, string>): Promise<TestResult> {
  const accessToken = await getGoogleAccessToken(secret, "https://www.googleapis.com/auth/drive");
  const response = await fetchWithTimeout("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { ok: false, message: await describeHttpError(response, "Drive từ chối request") };
  }

  const result = (await response.json()) as { user?: { emailAddress?: string } };
  const account = result.user?.emailAddress ?? "service account";

  if (!values.folderId) {
    return { ok: true, message: `Đã kết nối Drive với ${account}` };
  }

  const folderResponse = await fetchWithTimeout(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(values.folderId)}?fields=name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!folderResponse.ok) {
    return {
      ok: false,
      message: `Kết nối được Drive nhưng không đọc được thư mục: ${await describeHttpError(folderResponse, "không có quyền")}`,
    };
  }

  const folder = (await folderResponse.json()) as { name?: string };

  return { ok: true, message: `Đã kết nối Drive (${account}) — thư mục "${folder.name ?? values.folderId}"` };
}

async function testFacebook(secret: string, values: Record<string, string>): Promise<TestResult> {
  const pageId = values.pageId?.trim();

  if (!pageId) {
    return { ok: false, message: "Chưa nhập Page ID" };
  }

  const version = values.graphApiVersion?.trim() ?? "v20.0";
  const response = await fetchWithTimeout(
    `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}?fields=name&access_token=${encodeURIComponent(secret)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    return { ok: false, message: await describeHttpError(response, "Facebook từ chối request") };
  }

  const result = (await response.json()) as { name?: string };

  return { ok: true, message: `Đã kết nối fanpage "${result.name ?? pageId}"` };
}

async function testZalo(): Promise<TestResult> {
  const { prisma } = await import("@/lib/prisma");
  const token = await prisma.token.findFirst({
    orderBy: { id: "desc" },
    select: { access_token: true },
    where: { access_token: { not: null } },
  });

  const accessToken = token?.access_token?.trim() ?? "";

  if (!accessToken) {
    return { ok: false, message: "Chưa có access_token Zalo trong bảng token" };
  }

  const response = await fetchWithTimeout("https://openapi.zalo.me/v2.0/oa/getoa", {
    headers: { access_token: accessToken },
  });

  const result = (await response.json().catch(() => ({}))) as {
    error?: number;
    message?: string;
    data?: { name?: string };
  };

  if (!response.ok || (typeof result.error === "number" && result.error !== 0)) {
    return { ok: false, message: result.message ?? `Zalo trả về lỗi ${result.error ?? response.status}` };
  }

  return { ok: true, message: `Đã kết nối OA "${result.data?.name ?? "Zalo"}"` };
}

async function runConnectionTest(id: SrxConnectionId): Promise<TestResult> {
  const definition = getSrxConnectionDefinition(id);

  if (!definition) {
    return { ok: false, message: "Kết nối không hợp lệ" };
  }

  const values = await getSrxConnectionValues(id);
  const secret = await getSrxConnectionSecret(id);

  if (definition.secret && !secret) {
    return { ok: false, message: `Chưa cấu hình ${definition.secret.label}` };
  }

  switch (id) {
    case "claude":
      return testClaude(secret, values);
    case "chatgpt":
      return testOpenAiCompatible(secret, values, { defaultBaseUrl: "https://api.openai.com/v1", label: "OpenAI" });
    case "deepseek":
      return testOpenAiCompatible(secret, values, { defaultBaseUrl: "https://api.deepseek.com", label: "DeepSeek" });
    case "gemini":
      return testGemini(secret, values);
    case "google-drive":
      return testGoogleDrive(secret, values);
    case "facebook":
      return testFacebook(secret, values);
    case "zalo":
      return testZalo();
    default:
      return { ok: false, message: "Chưa hỗ trợ kiểm tra kết nối này" };
  }
}

export async function testSrxConnection(id: SrxConnectionId): Promise<SrxConnectionState> {
  let result: TestResult;

  try {
    result = await runConnectionTest(id);
  } catch (error) {
    result = {
      ok: false,
      message: error instanceof Error ? error.message : "Không thể kiểm tra kết nối",
    };
  }

  const next = await updateStore((store) => {
    const current = store.connections[id] ?? createEmptyConnection();
    const value: StoredConnection = {
      ...current,
      status: result.ok ? "ok" : "error",
      statusMessage: result.message,
      checkedAt: new Date().toISOString(),
    };

    store.connections[id] = value;

    return value;
  });

  return toConnectionState(id, next, await readTokenSecretRow());
}
