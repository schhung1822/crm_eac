import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { sendSrxLuckyWheelZbsTest } from "@/lib/srx-lucky-wheel-zbs";

/** Gửi thử tin ZBS voucher (mã mẫu 12345678) theo cấu hình đang lưu. */
export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền gửi tin ZBS");

    if (accessError) {
      return accessError;
    }

    const result = await sendSrxLuckyWheelZbsTest(await request.json());

    if (!result.ok) {
      return NextResponse.json({ message: `Zalo từ chối: ${result.errorMessage ?? ""}` }, { status: 400 });
    }

    return NextResponse.json({ message: "Đã gửi tin thử, kiểm tra Zalo của số điện thoại vừa nhập." });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể gửi tin thử");
  }
}
