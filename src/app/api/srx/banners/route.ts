import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxBanner, parseSrxBannerInput } from "@/lib/srx-website";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý banner SRX");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxBannerInput(await request.json());
    const banner = await createSrxBanner(payload);

    return NextResponse.json(
      {
        message: "Đã tạo banner",
        banner,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo banner");
  }
}

