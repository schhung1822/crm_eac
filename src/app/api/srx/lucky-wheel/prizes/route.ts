import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxLuckyWheelPrize } from "@/lib/srx-lucky-wheel";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phần thưởng vòng quay");

    if (accessError) {
      return accessError;
    }

    const prize = await createSrxLuckyWheelPrize(await request.json());

    return NextResponse.json({ message: "Đã thêm phần thưởng", prize }, { status: 201 });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể thêm phần thưởng");
  }
}
