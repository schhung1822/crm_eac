import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxLuckyWheelSettings, saveSrxLuckyWheelSettings } from "@/lib/srx-lucky-wheel";

export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem cấu hình vòng quay");

    if (accessError) {
      return accessError;
    }

    return NextResponse.json({ settings: await getSrxLuckyWheelSettings() });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải cấu hình vòng quay");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền cấu hình vòng quay");

    if (accessError) {
      return accessError;
    }

    const settings = await saveSrxLuckyWheelSettings(await request.json());

    return NextResponse.json({ message: "Đã lưu cấu hình vòng quay", settings });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể lưu cấu hình vòng quay");
  }
}
