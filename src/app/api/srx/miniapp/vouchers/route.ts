import { NextRequest, NextResponse } from "next/server";

import { readMiniAppSessionToken, resolveMiniAppSessionUserId } from "@/lib/srx-miniapp-auth";
import { getMiniAppPublicVouchers } from "@/lib/srx-miniapp-vouchers";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = "GET, OPTIONS";

/**
 * Ví voucher của Mini App.
 *
 * GET /api/srx/miniapp/vouchers   (header: Authorization: Bearer <token>)
 *
 * Trả về các mã trong `discount_codes` có `class = 'public'` còn hiệu lực. Yêu cầu đăng
 * nhập vì màn Ví Voucher trong Mini App nằm sau cổng đăng nhập.
 */
export async function GET(request: NextRequest) {
  try {
    const token = readMiniAppSessionToken(request);
    const userId = token ? await resolveMiniAppSessionUserId(token) : null;

    if (!userId) {
      return withMiniAppCors(
        NextResponse.json({ code: "unauthenticated", message: "Phiên đăng nhập đã hết hạn." }, { status: 401 }),
        request,
        ALLOWED_METHODS,
      );
    }

    const vouchers = await getMiniAppPublicVouchers();

    return withMiniAppCors(NextResponse.json({ vouchers }), request, ALLOWED_METHODS);
  } catch (error) {
    console.error("Mini App vouchers error:", error);

    return withMiniAppCors(
      NextResponse.json({ message: "Không thể tải danh sách voucher." }, { status: 500 }),
      request,
      ALLOWED_METHODS,
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request, ALLOWED_METHODS);
}
