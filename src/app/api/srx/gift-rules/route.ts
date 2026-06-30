import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { createSrxGiftRule, parseSrxGiftRuleInput } from "@/lib/srx-website";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý chương trình quà tặng SRX");

    if (accessError) {
      return accessError;
    }

    const payload = parseSrxGiftRuleInput(await request.json());
    const giftRule = await createSrxGiftRule(payload);

    return NextResponse.json(
      {
        message: "Đã tạo chương trình quà tặng",
        giftRule,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo chương trình quà tặng");
  }
}
