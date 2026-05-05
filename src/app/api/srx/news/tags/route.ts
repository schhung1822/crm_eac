import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxNewsTag, parseSrxNewsTagInput } from "@/lib/srx-news";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý thẻ tin tức");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxNewsTagInput(await request.json());
    const tag = await createSrxNewsTag(payload);

    return NextResponse.json(
      {
        message: "Đã tạo thẻ tin tức",
        tag,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo thẻ tin tức");
  }
}
