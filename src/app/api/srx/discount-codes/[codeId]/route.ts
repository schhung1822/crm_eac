import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxDiscountCode, parseSrxDiscountCodeInput, updateSrxDiscountCode } from "@/lib/srx-website";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý mã giảm giá SRX");

    if (accessError) {
      return accessError;
    }

    const { codeId } = await params;
    const payload = parseSrxDiscountCodeInput(await request.json());
    const discountCode = await updateSrxDiscountCode(codeId, payload);

    if (!discountCode) {
      return NextResponse.json({ message: "Không tìm thấy mã giảm giá" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật mã giảm giá",
      discountCode,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật mã giảm giá");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý mã giảm giá SRX");

    if (accessError) {
      return accessError;
    }

    const { codeId } = await params;
    await deleteSrxDiscountCode(codeId);

    return NextResponse.json({
      message: "Đã xóa mã giảm giá",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa mã giảm giá");
  }
}
