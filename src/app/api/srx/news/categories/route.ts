import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxNewsCategory, parseSrxNewsCategoryInput } from "@/lib/srx-news";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý danh mục tin tức");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxNewsCategoryInput(await request.json());
    const category = await createSrxNewsCategory(payload);

    return NextResponse.json(
      {
        message: "Đã tạo danh mục tin tức",
        category,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo danh mục tin tức");
  }
}
