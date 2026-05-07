import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { parseSrxAffiliateCommissionInput, updateSrxAffiliateAccountCommission } from "@/lib/srx-affiliates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền thiết lập hoa hồng affiliate SRX");

    if (accessError) {
      return accessError;
    }

    const { accountId } = await params;
    const payload = parseSrxAffiliateCommissionInput(await request.json());
    const account = await updateSrxAffiliateAccountCommission(accountId, payload);

    if (!account) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản affiliate" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật thiết lập hoa hồng",
      account,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật thiết lập hoa hồng");
  }
}

