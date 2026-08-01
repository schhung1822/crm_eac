import { NextRequest, NextResponse } from "next/server";

import { createMiniAppSession, getMiniAppCustomer } from "@/lib/srx-miniapp-auth";
import { resolveZaloProfile } from "@/lib/srx-zalo-graph";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";
import { findOrCreateZaloUser } from "@/lib/srx-zalo-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_METHODS = "POST, OPTIONS";

type LoginBody = {
  accessToken?: unknown;
  phoneToken?: unknown;
};

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ code, message }, { status });
}

function readClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";

  return ip ? ip.slice(0, 45) : null;
}

/**
 * Đăng nhập Mini App bằng uỷ quyền Zalo.
 *
 * POST /api/srx/miniapp/auth/login  { accessToken, phoneToken? }
 *
 * Server hỏi lại graph.zalo.me để xác thực accessToken (không tin dữ liệu client gửi lên),
 * ghép/tạo tài khoản trong bảng `users` dùng chung với website, rồi trả về session token
 * cùng thông tin khách hàng để Mini App hiển thị.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as LoginBody;
    const accessToken = String(body.accessToken ?? "").trim();

    if (!accessToken) {
      return withMiniAppCors(
        errorResponse("missing_token", "Thiếu access token của Zalo.", 400),
        request,
        ALLOWED_METHODS,
      );
    }

    let profile;

    try {
      profile = await resolveZaloProfile(accessToken, String(body.phoneToken ?? "").trim());
    } catch (error) {
      console.error("Mini App Zalo profile error:", error);

      return withMiniAppCors(
        errorResponse("zalo_verify_failed", "Không xác thực được tài khoản Zalo.", 401),
        request,
        ALLOWED_METHODS,
      );
    }

    const user = await findOrCreateZaloUser(profile);

    if (!user) {
      return withMiniAppCors(
        errorResponse("user_failed", "Không thể tạo tài khoản từ Zalo.", 500),
        request,
        ALLOWED_METHODS,
      );
    }

    if (["inactive", "banned"].includes(user.status)) {
      return withMiniAppCors(
        errorResponse("account_disabled", "Tài khoản hiện không thể đăng nhập.", 403),
        request,
        ALLOWED_METHODS,
      );
    }

    const session = await createMiniAppSession(user, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    const customer = await getMiniAppCustomer(user.id, profile.avatarUrl ?? "");

    if (!customer) {
      return withMiniAppCors(
        errorResponse("customer_not_found", "Không tìm thấy thông tin khách hàng.", 404),
        request,
        ALLOWED_METHODS,
      );
    }

    return withMiniAppCors(
      NextResponse.json({
        token: session.token,
        expiresAt: session.expiresAt,
        customer,
      }),
      request,
      ALLOWED_METHODS,
    );
  } catch (error) {
    console.error("Mini App login error:", error);

    return withMiniAppCors(
      NextResponse.json({ message: "Không thể đăng nhập lúc này." }, { status: 500 }),
      request,
      ALLOWED_METHODS,
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request, ALLOWED_METHODS);
}
