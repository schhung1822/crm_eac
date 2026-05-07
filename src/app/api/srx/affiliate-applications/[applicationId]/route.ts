import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { parseSrxAffiliateApplicationReviewInput, reviewSrxAffiliateApplication } from "@/lib/srx-affiliates";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền phê duyệt affiliate SRX");

    if (accessError) {
      return accessError;
    }

    const currentUser = await getCurrentUser();
    const { applicationId } = await params;
    const payload = parseSrxAffiliateApplicationReviewInput(await request.json());
    const application = await reviewSrxAffiliateApplication(applicationId, payload, currentUser?.userId);

    if (!application) {
      return NextResponse.json({ message: "Không tìm thấy hồ sơ affiliate" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật hồ sơ affiliate",
      application,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật hồ sơ affiliate");
  }
}

