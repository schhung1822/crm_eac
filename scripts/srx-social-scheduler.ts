import { getSrxDB } from "@/lib/srx-db";
import { publishDueSrxNewsSocialPosts } from "@/lib/srx-news";
import type { RowDataPacket } from "mysql2/promise";

const LOCK_NAME = "srx_news_social_scheduler";
const DEFAULT_LIMIT = 20;

type LockRow = RowDataPacket & {
  lock_result: number | null;
};

function parseLimit(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const parsedLimit = Number(limitArg?.slice("--limit=".length) ?? process.env.SRX_SOCIAL_SCHEDULER_LIMIT ?? DEFAULT_LIMIT);

  return Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT;
}

async function acquireLock(): Promise<boolean> {
  const db = getSrxDB();
  const [rows] = await db.query<LockRow[]>("SELECT GET_LOCK(?, 0) AS lock_result", [LOCK_NAME]);

  return rows[0]?.lock_result === 1;
}

async function releaseLock(): Promise<void> {
  const db = getSrxDB();
  await db.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
}

async function main(): Promise<void> {
  const db = getSrxDB();
  const hasLock = await acquireLock();

  if (!hasLock) {
    console.log("SRX social scheduler is already running. Skipped.");
    return;
  }

  try {
    const result = await publishDueSrxNewsSocialPosts(parseLimit());

    console.log(
      JSON.stringify(
        {
          checked: result.checked,
          failed: result.failed.length,
          published: result.published.length,
          publishedPosts: result.published,
          failedPosts: result.failed,
        },
        null,
        2,
      ),
    );

    if (result.failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await releaseLock().catch(() => undefined);
    await db.end().catch(() => undefined);
  }
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  await getSrxDB()
    .end()
    .catch(() => undefined);
  process.exit(1);
});
