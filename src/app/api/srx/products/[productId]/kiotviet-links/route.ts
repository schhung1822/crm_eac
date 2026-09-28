import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getProductKiotVietLinks, saveProductKiotVietLinks } from "@/lib/srx-kiotviet-links";
import { parseSrxKiotVietLinksInput } from "@/lib/srx-kiotviet-links.shared";

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem liên kết KiotViet");

    if (accessError) {
      return accessError;
    }

    const { productId } = await params;

    if (!/^\d+$/.test(productId)) {
      return NextResponse.json({ message: "ID sản phẩm không hợp lệ" }, { status: 400 });
    }

    return NextResponse.json({ links: await getProductKiotVietLinks(productId) });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải liên kết KiotViet");
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền sửa liên kết KiotViet");

    if (accessError) {
      return accessError;
    }

    const { productId } = await params;

    if (!/^\d+$/.test(productId)) {
      return NextResponse.json({ message: "ID sản phẩm không hợp lệ" }, { status: 400 });
    }

    await saveProductKiotVietLinks(productId, parseSrxKiotVietLinksInput(await request.json()));

    return NextResponse.json({ message: "Đã lưu liên kết KiotViet", links: await getProductKiotVietLinks(productId) });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể lưu liên kết KiotViet");
  }
}
