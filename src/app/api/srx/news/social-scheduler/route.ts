/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- secret/limit lấy từ chuỗi env, rỗng phải rơi về nguồn kế tiếp. */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxDB } from "@/lib/srx-db";
import { getSrxNewsSocialSchedulerStatus, publishDueSrxNewsSocialPosts } from "@/lib/srx-news";
import { readSrxSocialIntegrationSettings } from "@/lib/srx-social-integration-settings";

const LOCK_NAME = "srx_news_social_scheduler";

async function getSchedulerSecret(): Promise<string> {
  const settings = await readSrxSocialIntegrationSettings();
  return (
    process.env.SRX_SOCIAL_SCHEDULER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    settings.schedulerSecret.trim()
  );
}

async function ensureSchedulerAccess(request: NextRequest): Promise<NextResponse | null> {
  const schedulerSecret = await getSchedulerSecret();

  if (!schedulerSecret) {
    return ensureAdminApiAccess(request, "Ban khong co quyen chay hen gio dang bai");
  }

  const bearerToken =
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ?? "";
  const headerToken = request.headers.get("x-cron-secret")?.trim() ?? "";
  const queryToken = request.nextUrl.searchParams.get("secret")?.trim() ?? "";

  if ([bearerToken, headerToken, queryToken].includes(schedulerSecret)) {
    return null;
  }

  return NextResponse.json({ message: "Unauthorized scheduler request" }, { status: 401 });
}

async function acquireSchedulerLock(): Promise<boolean> {
  const db = getSrxDB();
  const [rows] = await db.query<Array<RowDataPacket & { lock_result: number | null }>>(
    "SELECT GET_LOCK(?, 0) AS lock_result",
    [LOCK_NAME],
  );

  return rows[0]?.lock_result === 1;
}

async function releaseSchedulerLock(): Promise<void> {
  const db = getSrxDB();
  await db.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
}

async function readSchedulerLimit(request: NextRequest): Promise<number> {
  const settings = await readSrxSocialIntegrationSettings();
  const limit = Number(
    request.nextUrl.searchParams.get("limit") ??
      process.env.SRX_SOCIAL_SCHEDULER_LIMIT ??
      settings.schedulerLimit ??
      "20",
  );

  return Number.isFinite(limit) ? limit : 20;
}

function isStatusRequest(request: NextRequest): boolean {
  const mode = request.nextUrl.searchParams.get("mode")?.trim().toLowerCase() ?? "";

  return request.nextUrl.searchParams.has("status") || mode === "status" || mode === "dry-run";
}

async function handleSchedulerRequest(request: NextRequest): Promise<NextResponse> {
  let hasLock = false;

  try {
    const accessError = await ensureSchedulerAccess(request);

    if (accessError) {
      return accessError;
    }

    hasLock = await acquireSchedulerLock();

    if (!hasLock) {
      return NextResponse.json({
        message: "Scheduler dang chay, bo qua lan goi nay",
        skipped: true,
      });
    }

    const limit = await readSchedulerLimit(request);

    if (isStatusRequest(request)) {
      const status = await getSrxNewsSocialSchedulerStatus(limit);

      return NextResponse.json({
        message: "Trang thai lich dang bai Facebook/Zalo OA",
        ...status,
      });
    }

    const result = await publishDueSrxNewsSocialPosts(limit);

    return NextResponse.json({
      message: "Da xu ly lich dang bai Facebook/Zalo OA",
      ...result,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Khong the xu ly lich dang bai Facebook/Zalo OA");
  } finally {
    if (hasLock) {
      await releaseSchedulerLock().catch(() => undefined);
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleSchedulerRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleSchedulerRequest(request);
}
