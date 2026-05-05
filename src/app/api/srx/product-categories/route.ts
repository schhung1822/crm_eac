import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxProductCategory, parseSrxProductCategoryInput } from "@/lib/srx-products";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý danh mục sản phẩm");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxProductCategoryInput(await request.json());
    const category = await createSrxProductCategory(payload);

    return NextResponse.json(
      {
        message: "Đã tạo danh mục sản phẩm mới",
        category,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo danh mục sản phẩm");
  }
}
