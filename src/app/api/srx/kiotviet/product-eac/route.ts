import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { searchProductEac } from "@/lib/srx-kiotviet-links";

/** GET /api/srx/kiotviet/product-eac?q=... — tìm sản phẩm KiotViet (bảng product_eac) để liên kết. */
export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem sản phẩm KiotViet");

    if (accessError) {
      return accessError;
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";

    return NextResponse.json({ items: await searchProductEac(query) });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tìm sản phẩm KiotViet");
  }
}
