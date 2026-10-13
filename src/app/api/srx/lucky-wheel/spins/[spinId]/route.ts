import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { updateSrxLuckyWheelSpinStatus } from "@/lib/srx-lucky-wheel";

/** Đánh dấu đã trao / chưa trao phần thưởng cho khách. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ spinId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền cập nhật lượt quay");

    if (accessError) {
      return accessError;
    }

    const { spinId } = await params;
    const spin = await updateSrxLuckyWheelSpinStatus(spinId, await request.json());

    if (!spin) {
      return NextResponse.json({ message: "Không tìm thấy lượt quay" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã cập nhật lượt quay", spin });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật lượt quay");
  }
}
