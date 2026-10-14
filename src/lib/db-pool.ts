// Cấu hình chung cho mọi kết nối DB của ứng dụng. Có 4 pool (2 mysql2 và 2 Prisma) cùng trỏ vào MySQL,
// nên mỗi pool được giới hạn nhỏ để tổng số kết nối của một bản chạy không vượt quá sức chịu của máy chủ DB.
const DEFAULT_POOL_LIMIT = 5;

function readPoolLimit(): number {
  const parsed = Number(process.env.DB_POOL_LIMIT);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_LIMIT;
}

export const DB_POOL_LIMIT = readPoolLimit();

/** Tuỳ chọn mysql2 dùng chung: giới hạn số kết nối, trả lại kết nối nhàn rỗi và giữ kết nối sống. */
export function getMysqlPoolOptions() {
  return {
    connectTimeout: 30_000,
    waitForConnections: true,
    connectionLimit: DB_POOL_LIMIT,
    maxIdle: Math.min(DB_POOL_LIMIT, 2),
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    charset: "utf8mb4",
    decimalNumbers: true,
  } as const;
}

/** Thêm giới hạn kết nối vào URL Prisma nếu URL chưa tự đặt. */
export function withPrismaPoolParams(url: string): string {
  try {
    const parsed = new URL(url);

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(DB_POOL_LIMIT));
    }

    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
