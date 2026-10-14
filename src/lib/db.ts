import mysql, { type Pool } from "mysql2/promise";

import { getPrimaryDbConfig } from "@/lib/database-env";
import { getMysqlPoolOptions } from "@/lib/db-pool";

// Giữ pool trên globalThis để không tạo thêm pool mỗi lần nạp lại module khi chạy dev.
const globalForDb = globalThis as unknown as { primaryDbPool: Pool | undefined };

export function getDB(): Pool {
  if (!globalForDb.primaryDbPool) {
    const config = getPrimaryDbConfig();

    globalForDb.primaryDbPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ...getMysqlPoolOptions(),
    });
  }

  return globalForDb.primaryDbPool;
}
