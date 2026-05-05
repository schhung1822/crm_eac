import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxProduct, parseSrxProductInput } from "@/lib/srx-products";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý sản phẩm website");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxProductInput(await request.json());
    const product = await createSrxProduct(payload);

    return NextResponse.json(
      {
        message: "Đã tạo sản phẩm mới",
        product,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo sản phẩm");
  }
}
