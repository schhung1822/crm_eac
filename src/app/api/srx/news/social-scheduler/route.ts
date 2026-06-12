import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { publishDueSrxNewsSocialPosts } from "@/lib/srx-news";

function getSchedulerSecret(): string {
  return process.env.SRX_SOCIAL_SCHEDULER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";
}

async function ensureSchedulerAccess(request: NextRequest): Promise<NextResponse | null> {
  const schedulerSecret = getSchedulerSecret();

  if (!schedulerSecret) {
    return ensureAdminApiAccess(request, "Ban khong co quyen chay hen gio dang bai");
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const headerToken = request.headers.get("x-cron-secret")?.trim() ?? "";
  const queryToken = request.nextUrl.searchParams.get("secret")?.trim() ?? "";

  if ([bearerToken, headerToken, queryToken].includes(schedulerSecret)) {
    return null;
  }

  return NextResponse.json({ message: "Unauthorized scheduler request" }, { status: 401 });
}

async function handleSchedulerRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const accessError = await ensureSchedulerAccess(request);

    if (accessError) {
      return accessError;
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const result = await publishDueSrxNewsSocialPosts(Number.isFinite(limit) ? limit : 20);

    return NextResponse.json({
      message: "Da xu ly lich dang bai Facebook/Zalo OA",
      ...result,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Khong the xu ly lich dang bai Facebook/Zalo OA");
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleSchedulerRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleSchedulerRequest(request);
}
