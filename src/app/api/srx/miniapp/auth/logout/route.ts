import { NextRequest, NextResponse } from "next/server";

import { readMiniAppSessionToken, revokeMiniAppSession } from "@/lib/srx-miniapp-auth";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = "POST, OPTIONS";

/**
 * Đăng xuất Mini App: xoá phiên trong `user_sessions`.
 *
 * POST /api/srx/miniapp/auth/logout   (header: Authorization: Bearer <token>)
 *
 * Luôn trả 200 để Mini App xoá token cục bộ dù token đã hết hạn từ trước.
 */
export async function POST(request: NextRequest) {
  try {
    await revokeMiniAppSession(readMiniAppSessionToken(request));

    return withMiniAppCors(NextResponse.json({ status: "signed_out" }), request, ALLOWED_METHODS);
  } catch (error) {
    console.error("Mini App logout error:", error);

    return withMiniAppCors(NextResponse.json({ status: "signed_out" }), request, ALLOWED_METHODS);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request, ALLOWED_METHODS);
}
