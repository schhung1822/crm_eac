import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxNewsPost, parseSrxNewsPostInput } from "@/lib/srx-news";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý tin tức website");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxNewsPostInput(await request.json());
    const post = await createSrxNewsPost(payload);

    return NextResponse.json(
      {
        message: "Đã tạo bài viết mới",
        post,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo bài viết");
  }
}
