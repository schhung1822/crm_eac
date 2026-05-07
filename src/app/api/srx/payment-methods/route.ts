import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxPaymentMethod, parseSrxPaymentMethodInput } from "@/lib/srx-website";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phương thức thanh toán SRX");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxPaymentMethodInput(await request.json());
    const paymentMethod = await createSrxPaymentMethod(payload);

    return NextResponse.json(
      {
        message: "Đã tạo phương thức thanh toán",
        paymentMethod,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo phương thức thanh toán");
  }
}

