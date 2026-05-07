import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { parseSrxAffiliateManagementInput, updateSrxAffiliateAccountManagement } from "@/lib/srx-affiliates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý affiliate SRX");

    if (accessError) {
      return accessError;
    }

    const currentUser = await getCurrentUser();
    const { accountId } = await params;
    const payload = parseSrxAffiliateManagementInput(await request.json());
    const account = await updateSrxAffiliateAccountManagement(accountId, payload, currentUser?.userId);

    if (!account) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản affiliate" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật affiliate",
      account,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật affiliate");
  }
}

