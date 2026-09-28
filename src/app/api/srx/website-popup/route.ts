import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxWebsitePopupSettings, saveSrxWebsitePopupSettings } from "@/lib/srx-website-popup";

export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem cấu hình popup");

    if (accessError) {
      return accessError;
    }

    return NextResponse.json({ settings: await getSrxWebsitePopupSettings() });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải cấu hình popup");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền cấu hình popup");

    if (accessError) {
      return accessError;
    }

    const settings = await saveSrxWebsitePopupSettings(await request.json());

    return NextResponse.json({ message: "Đã lưu cấu hình popup", settings });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể lưu cấu hình popup");
  }
}
