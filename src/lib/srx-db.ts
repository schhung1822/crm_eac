import mysql, { Pool } from "mysql2/promise";

import { getMysqlPoolOptions } from "@/lib/db-pool";
import { getSrxDbConfig } from "@/lib/srx-env";

const globalForSrxDb = globalThis as unknown as {
  srxDbPool: Pool | undefined;
};

export function getSrxDB(): Pool {
  if (globalForSrxDb.srxDbPool) {
    return globalForSrxDb.srxDbPool;
  }

  const config = getSrxDbConfig();

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ...getMysqlPoolOptions(),
  });

  globalForSrxDb.srxDbPool = pool;

  return pool;
}

export async function resetSrxDB(): Promise<void> {
  const existingPool = globalForSrxDb.srxDbPool;
  globalForSrxDb.srxDbPool = undefined;

  if (!existingPool) {
    return;
  }

  try {
    await existingPool.end();
  } catch {
    // Ignore teardown errors. The next request will build a fresh pool.
  }
}
