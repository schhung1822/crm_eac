/* eslint-disable complexity, security/detect-object-injection */
import { URL } from "node:url";

export interface MysqlDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  url: string;
}

interface ResolveMysqlDbConfigOptions {
  canonicalUrlEnv: string;
  aliasUrlEnvs?: string[];
  hostEnvs: string[];
  portEnvs: string[];
  userEnvs: string[];
  passwordEnvs: string[];
  databaseEnvs: string[];
  label: string;
}

type MysqlDbConfigWithoutUrl = Omit<MysqlDbConfig, "url">;
type ParsedMysqlUrlResult = { config?: MysqlDbConfigWithoutUrl; error?: Error };

const configCache = new Map<string, MysqlDbConfig>();

function readValue(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function readPassword(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value === undefined) {
      continue;
    }

    return value.trim();
  }

  return undefined;
}

function parsePort(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid database port: ${value}`);
  }

  return port;
}

function safeDecodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildMysqlUrl(config: MysqlDbConfigWithoutUrl): string {
  return `mysql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${encodeURIComponent(config.database)}`;
}

function readNamedMysqlDbConfig(
  hostEnvs: string[],
  portEnvs: string[],
  userEnvs: string[],
  passwordEnvs: string[],
  databaseEnvs: string[],
): MysqlDbConfigWithoutUrl | undefined {
  const host = readValue(...hostEnvs.map((envName) => process.env[envName]));
  const user = readValue(...userEnvs.map((envName) => process.env[envName]));
  const password = readPassword(...passwordEnvs.map((envName) => process.env[envName]));
  const database = readValue(...databaseEnvs.map((envName) => process.env[envName]));
  const port = parsePort(readValue(...portEnvs.map((envName) => process.env[envName]))) ?? 3306;

  if (!host || !user || password === undefined || !database) {
    return undefined;
  }

  return {
    host,
    port,
    user,
    password,
    database,
  };
}

function parseMysqlUrl(url: string, label: string): MysqlDbConfigWithoutUrl {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "mysql:") {
      throw new Error(`Unsupported ${label} database protocol: ${parsedUrl.protocol}`);
    }

    const database = safeDecodeUrlComponent(parsedUrl.pathname.replace(/^\/+/, ""));
    const port = parsePort(parsedUrl.port) ?? 3306;

    if (!parsedUrl.hostname || !parsedUrl.username || !database) {
      throw new Error(`${label} database URL must include host, username, and database name.`);
    }

    return {
      host: parsedUrl.hostname,
      port,
      user: safeDecodeUrlComponent(parsedUrl.username),
      password: safeDecodeUrlComponent(parsedUrl.password),
      database,
    };
  } catch {
    const normalizedUrl = url.trim();

    if (!normalizedUrl.startsWith("mysql://")) {
      throw new Error(`${label} database URL must start with mysql://`);
    }

    const withoutProtocol = normalizedUrl.slice("mysql://".length);
    const slashIndex = withoutProtocol.indexOf("/");

    if (slashIndex === -1) {
      throw new Error(`${label} database URL must include a database name.`);
    }

    const authority = withoutProtocol.slice(0, slashIndex);
    const pathname = withoutProtocol.slice(slashIndex + 1);
    const atIndex = authority.lastIndexOf("@");

    if (atIndex === -1) {
      throw new Error(`${label} database URL must include credentials and host.`);
    }

    const auth = authority.slice(0, atIndex);
    const hostAndPort = authority.slice(atIndex + 1);
    const colonIndex = auth.indexOf(":");

    if (colonIndex === -1) {
      throw new Error(`${label} database URL must include both username and password.`);
    }

    const user = safeDecodeUrlComponent(auth.slice(0, colonIndex));
    const password = safeDecodeUrlComponent(auth.slice(colonIndex + 1));

    let host = hostAndPort;
    let port = 3306;

    const portSeparator = hostAndPort.lastIndexOf(":");

    if (portSeparator !== -1) {
      const parsedPort = parsePort(hostAndPort.slice(portSeparator + 1));

      if (parsedPort) {
        port = parsedPort;
        host = hostAndPort.slice(0, portSeparator);
      }
    }

    const database = safeDecodeUrlComponent(pathname.replace(/^\/+/, ""));

    if (!host || !user || !database) {
      throw new Error(`${label} database URL must include host, username, and database name.`);
    }

    return {
      host,
      port,
      user,
      password,
      database,
    };
  }
}

function tryParseMysqlUrl(url: string, label: string): ParsedMysqlUrlResult {
  try {
    return {
      config: parseMysqlUrl(url, label),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(`Invalid ${label} database URL.`),
    };
  }
}

function resolveMysqlDbConfig({
  canonicalUrlEnv,
  aliasUrlEnvs = [],
  hostEnvs,
  portEnvs,
  userEnvs,
  passwordEnvs,
  databaseEnvs,
  label,
}: ResolveMysqlDbConfigOptions): MysqlDbConfig {
  const cacheKey = `${label}:${canonicalUrlEnv}`;
  const cachedConfig = configCache.get(cacheKey);

  if (cachedConfig) {
    return cachedConfig;
  }

  const explicitUrl = readValue(process.env[canonicalUrlEnv], ...aliasUrlEnvs.map((envName) => process.env[envName]));
  const namedConfig = readNamedMysqlDbConfig(hostEnvs, portEnvs, userEnvs, passwordEnvs, databaseEnvs);
  const parsedUrl = explicitUrl ? tryParseMysqlUrl(explicitUrl, label) : undefined;
  const baseConfig = namedConfig ?? parsedUrl?.config;

  if (!baseConfig) {
    const fallbackNames = [...hostEnvs, ...portEnvs, ...userEnvs, ...passwordEnvs, ...databaseEnvs].join(", ");

    if (parsedUrl?.error) {
      throw new Error(
        `${parsedUrl.error.message} If your password contains special characters like @, :, /, ?, # or %, prefer the named env vars (${fallbackNames}) or URL-encode the password in ${canonicalUrlEnv}.`,
      );
    }

    throw new Error(
      `Missing ${label} database configuration. Provide ${canonicalUrlEnv}${aliasUrlEnvs.length ? ` or ${aliasUrlEnvs.join(", ")}` : ""}, or define ${fallbackNames}.`,
    );
  }

  const url = namedConfig
    ? buildMysqlUrl(namedConfig)
    : parsedUrl?.config
      ? (explicitUrl ?? buildMysqlUrl(baseConfig))
      : buildMysqlUrl(baseConfig);
  const resolvedConfig = {
    ...baseConfig,
    url,
  };

  process.env[canonicalUrlEnv] = url;

  for (const envName of aliasUrlEnvs) {
    process.env[envName] = url;
  }

  configCache.set(cacheKey, resolvedConfig);

  return resolvedConfig;
}

function aliasResolvedConfig(
  canonicalUrlEnv: string,
  aliasUrlEnvs: string[],
  label: string,
  config: MysqlDbConfig,
): MysqlDbConfig {
  process.env[canonicalUrlEnv] = config.url;

  for (const envName of aliasUrlEnvs) {
    process.env[envName] = config.url;
  }

  configCache.set(`${label}:${canonicalUrlEnv}`, config);

  return config;
}

function resolvePrimaryDbConfigBase(): MysqlDbConfig {
  return resolveMysqlDbConfig({
    canonicalUrlEnv: "DATABASE_URL",
    aliasUrlEnvs: ["CRM_DATABASE_URL"],
    hostEnvs: ["CRM_DB_HOST", "DB_HOST"],
    portEnvs: ["CRM_DB_PORT", "DB_PORT"],
    userEnvs: ["CRM_DB_USER", "DB_USER"],
    passwordEnvs: ["CRM_DB_PASSWORD", "DB_PASSWORD"],
    databaseEnvs: ["CRM_DB_NAME", "DB_NAME"],
    label: "CRM",
  });
}

function resolveSrxDbConfigBase(): MysqlDbConfig {
  return resolveMysqlDbConfig({
    canonicalUrlEnv: "DATABASE_URL2",
    aliasUrlEnvs: ["SRX_DATABASE_URL"],
    hostEnvs: ["SRX_DB_HOST"],
    portEnvs: ["SRX_DB_PORT"],
    userEnvs: ["SRX_DB_USER"],
    passwordEnvs: ["SRX_DB_PASSWORD"],
    databaseEnvs: ["SRX_DB_NAME"],
    label: "SRX",
  });
}

export function getPrimaryDbConfig(): MysqlDbConfig {
  try {
    return aliasResolvedConfig("DATABASE_URL", ["CRM_DATABASE_URL"], "CRM", resolveSrxDbConfigBase());
  } catch {
    try {
      return resolvePrimaryDbConfigBase();
    } catch (primaryError) {
      try {
        return aliasResolvedConfig("DATABASE_URL", ["CRM_DATABASE_URL"], "CRM", resolveSrxDbConfigBase());
      } catch {
        throw primaryError;
      }
    }
  }
}

export function ensurePrimaryDatabaseEnv(): string {
  return getPrimaryDbConfig().url;
}

export function getSrxDbConfig(): MysqlDbConfig {
  try {
    return resolveSrxDbConfigBase();
  } catch (srxError) {
    try {
      return aliasResolvedConfig("DATABASE_URL2", ["SRX_DATABASE_URL"], "SRX", resolvePrimaryDbConfigBase());
    } catch {
      throw srxError;
    }
  }
}

export function ensureSrxDatabaseEnv(): string {
  return getSrxDbConfig().url;
}
