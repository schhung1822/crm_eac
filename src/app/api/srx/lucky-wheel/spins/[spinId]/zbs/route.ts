import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { resendSrxLuckyWheelSpinZbs } from "@/lib/srx-lucky-wheel-zbs";

/** Gửi lại tin ZBS kèm mã voucher cho một lượt trúng. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ spinId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền gửi tin ZBS");

    if (accessError) {
      return accessError;
    }

    const { spinId } = await params;
    const spin = await resendSrxLuckyWheelSpinZbs(spinId);

    if (!spin) {
      return NextResponse.json({ message: "Không tìm thấy lượt quay" }, { status: 404 });
    }

    return NextResponse.json({
      message: spin.zbs_status === "sent" ? "Đã gửi tin ZBS" : `Gửi không thành công: ${spin.zbs_error ?? ""}`,
      spin,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể gửi tin ZBS");
  }
}
