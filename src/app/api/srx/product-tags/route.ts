import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxProductTag, parseSrxProductTagInput } from "@/lib/srx-products";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý từ điển thành phần");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxProductTagInput(await request.json());
    const tag = await createSrxProductTag(payload);

    return NextResponse.json(
      {
        message: "Đã tạo thành phần mới",
        tag,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo thành phần");
  }
}
