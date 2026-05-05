// eslint-disable-next-line import/no-unresolved -- `server-only` is a Next.js virtual module.
import "server-only";

import { resetSrxDB } from "@/lib/srx-db";

type ErrorLike = {
  code?: string;
  errno?: number;
  message?: string;
  sqlMessage?: string;
};

const missingTableCodes = new Set(["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE", "P2021", "P2022"]);
const unavailableConnectionCodes = new Set([
  "ER_ACCESS_DENIED_ERROR",
  "ECONNABORTED",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENOTFOUND",
  "ETIMEDOUT",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
  "PROTOCOL_CONNECTION_LOST",
  "P1000",
  "P1001",
  "P1002",
]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isMissingSrxTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as ErrorLike;

  if (typeof candidate.code === "string" && missingTableCodes.has(candidate.code)) {
    return true;
  }

  if (candidate.errno === 1054 || candidate.errno === 1146) {
    return true;
  }

  const combinedMessage = [candidate.message, candidate.sqlMessage].filter(Boolean).join(" ");

  return /does not exist in the current database|doesn't exist|table .* doesn't exist|unknown column/i.test(
    combinedMessage,
  );
}

export function isUnavailableSrxConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as ErrorLike;

  if (typeof candidate.code === "string" && unavailableConnectionCodes.has(candidate.code)) {
    return true;
  }

  const combinedMessage = [candidate.message, candidate.sqlMessage].filter(Boolean).join(" ");

  return /access denied|connect econnrefused|read econnreset|socket hang up|can't connect|connection.*timed out|unknown mysql server host/i.test(
    combinedMessage,
  );
}

export async function withSrxReadFallback<T>(scope: string, fallback: T, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isMissingSrxTableError(error)) {
      console.warn(
        `[SRX] ${scope} is unavailable because the configured database is missing SRX tables: ${getErrorMessage(error)}`,
      );
      return fallback;
    }

    if (isUnavailableSrxConnectionError(error)) {
      await resetSrxDB();
      console.warn(
        `[SRX] ${scope} is unavailable because the SRX database connection failed: ${getErrorMessage(error)}`,
      );
      return fallback;
    }

    throw error;
  }
}

export function wrapMissingSrxSchemaError(error: unknown, message: string): never {
  if (isMissingSrxTableError(error)) {
    throw new Error(message);
  }

  throw error;
}
