import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { resolveStackWithPublic, saveDiscountCodeStackFlag } from "@/lib/srx-discount-code-extras";
import { createSrxDiscountCode, parseSrxDiscountCodeInput } from "@/lib/srx-website";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý mã giảm giá SRX");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxDiscountCodeInput(await request.json());
    const created = await createSrxDiscountCode(payload);
    const stackWithPublic = resolveStackWithPublic(payload);

    await saveDiscountCodeStackFlag(created.id, stackWithPublic);

    const discountCode = { ...created, stack_with_public: stackWithPublic };

    return NextResponse.json(
      {
        message: "Đã tạo mã giảm giá",
        discountCode,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo mã giảm giá");
  }
}
