import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxLuckyWheelPrize, updateSrxLuckyWheelPrize } from "@/lib/srx-lucky-wheel";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ prizeId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phần thưởng vòng quay");

    if (accessError) {
      return accessError;
    }

    const { prizeId } = await params;
    const prize = await updateSrxLuckyWheelPrize(prizeId, await request.json());

    if (!prize) {
      return NextResponse.json({ message: "Không tìm thấy phần thưởng" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã cập nhật phần thưởng", prize });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật phần thưởng");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ prizeId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phần thưởng vòng quay");

    if (accessError) {
      return accessError;
    }

    const { prizeId } = await params;

    if (!(await deleteSrxLuckyWheelPrize(prizeId))) {
      return NextResponse.json({ message: "Không tìm thấy phần thưởng" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã xóa phần thưởng" });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa phần thưởng");
  }
}
