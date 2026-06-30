import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxGiftRule, parseSrxGiftRuleInput, updateSrxGiftRule } from "@/lib/srx-website";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý chương trình quà tặng SRX");

    if (accessError) {
      return accessError;
    }

    const { ruleId } = await params;
    const payload = parseSrxGiftRuleInput(await request.json());
    const giftRule = await updateSrxGiftRule(ruleId, payload);

    if (!giftRule) {
      return NextResponse.json({ message: "Không tìm thấy chương trình quà tặng" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật chương trình quà tặng",
      giftRule,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật chương trình quà tặng");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý chương trình quà tặng SRX");

    if (accessError) {
      return accessError;
    }

    const { ruleId } = await params;
    await deleteSrxGiftRule(ruleId);

    return NextResponse.json({
      message: "Đã xóa chương trình quà tặng",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa chương trình quà tặng");
  }
}
