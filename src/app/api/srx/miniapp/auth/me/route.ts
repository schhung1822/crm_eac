import { NextRequest, NextResponse } from "next/server";

import { getMiniAppCustomer, readMiniAppSessionToken, resolveMiniAppSessionUserId } from "@/lib/srx-miniapp-auth";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = "GET, OPTIONS";

/**
 * Thông tin khách hàng của phiên Mini App hiện tại.
 *
 * GET /api/srx/miniapp/auth/me   (header: Authorization: Bearer <token>)
 *
 * Trả 401 khi token sai/hết hạn để Mini App tự xoá token và hiện lại màn đăng nhập.
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

    const customer = await getMiniAppCustomer(userId);

    if (!customer) {
      return withMiniAppCors(
        NextResponse.json(
          { code: "customer_not_found", message: "Không tìm thấy thông tin khách hàng." },
          { status: 404 },
        ),
        request,
        ALLOWED_METHODS,
      );
    }

    return withMiniAppCors(NextResponse.json({ customer }), request, ALLOWED_METHODS);
  } catch (error) {
    console.error("Mini App profile error:", error);

    return withMiniAppCors(
      NextResponse.json({ message: "Không thể tải thông tin khách hàng." }, { status: 500 }),
      request,
      ALLOWED_METHODS,
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request, ALLOWED_METHODS);
}
