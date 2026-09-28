import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxLadipageZbsLogs, saveSrxLadipageZbsSettings } from "@/lib/srx-ladipage-zbs";

type RouteContext = { params: Promise<{ eventId: string }> };

async function readEventId(context: RouteContext): Promise<string | null> {
  const { eventId } = await context.params;
  return /^\d+$/.test(eventId) ? eventId : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem cấu hình ZBS");

    if (accessError) {
      return accessError;
    }

    const eventId = await readEventId(context);

    if (!eventId) {
      return NextResponse.json({ message: "ID sự kiện không hợp lệ" }, { status: 400 });
    }

    return NextResponse.json({ logs: await getSrxLadipageZbsLogs(eventId) });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải nhật ký ZBS");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền cấu hình ZBS");

    if (accessError) {
      return accessError;
    }

    const eventId = await readEventId(context);

    if (!eventId) {
      return NextResponse.json({ message: "ID sự kiện không hợp lệ" }, { status: 400 });
    }

    const settings = await saveSrxLadipageZbsSettings(eventId, await request.json());

    return NextResponse.json({ message: "Đã lưu cấu hình ZBS", settings });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể lưu cấu hình ZBS");
  }
}
