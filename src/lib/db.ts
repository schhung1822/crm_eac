import mysql, { type Pool } from "mysql2/promise";

import { getPrimaryDbConfig } from "@/lib/database-env";

let pool: Pool | undefined;

export function getDB(): Pool {
  if (!pool) {
    const config = getPrimaryDbConfig();

    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 30_000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      decimalNumbers: true,
    });
  }

  return pool;
}
