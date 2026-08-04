import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { createSrxAffiliateAccount, parseSrxAffiliateAccountCreateInput } from "@/lib/srx-affiliates";

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tạo affiliate SRX");

    if (accessError) {
      return accessError;
    }

    const currentUser = await getCurrentUser();
    const payload = parseSrxAffiliateAccountCreateInput(await request.json());
    const account = await createSrxAffiliateAccount(payload, currentUser?.userId);

    return NextResponse.json(
      {
        message: "Đã tạo affiliate mới",
        account,
      },
      { status: 201 },
    );
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tạo affiliate");
  }
}
