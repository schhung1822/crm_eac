import { NextRequest, NextResponse } from "next/server";

import { resolveZaloProfile } from "@/lib/srx-zalo-graph";
import {
  cancelTicket,
  confirmTicketLogin,
  findTicket,
  isTicketActionable,
  isTicketExpired,
  normalizeTicket,
  type ZaloLoginTicketRow,
} from "@/lib/srx-zalo-login";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";
import { findOrCreateZaloUser, type SrxUserRow } from "@/lib/srx-zalo-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request);
}

type ConfirmBody = {
  ticket?: unknown;
  decision?: unknown;
  accessToken?: unknown;
  phoneToken?: unknown;
};

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ code, message }, { status });
}

/** Ticket hợp lệ và còn dùng được, hoặc phản hồi lỗi tương ứng. */
async function resolveActionableTicket(
  ticket: string,
): Promise<{ ticket: ZaloLoginTicketRow } | { error: NextResponse }> {
  const row = await findTicket(ticket);

  if (!row || isTicketExpired(row)) {
    return { error: errorResponse("expired", "Mã QR đã hết hạn.", 410) };
  }

  if (!isTicketActionable(row)) {
    return { error: errorResponse(row.status, "Mã QR không còn hiệu lực.", 409) };
  }

  return { ticket: row };
}

function resolveDisplayName(user: SrxUserRow): string {
  const displayName = String(user.display_name ?? "").trim();

  return displayName ? displayName : user.full_name;
}

/** Đổi access token của Zalo lấy tài khoản trong DB dùng chung với website. */
async function resolveUserFromZalo(body: ConfirmBody): Promise<{ user: SrxUserRow } | { error: NextResponse }> {
  const accessToken = String(body.accessToken ?? "").trim();

  if (!accessToken) {
    return { error: errorResponse("missing_token", "Thiếu access token của Zalo.", 400) };
  }

  let profile;

  try {
    profile = await resolveZaloProfile(accessToken, String(body.phoneToken ?? "").trim());
  } catch (error) {
    console.error("Zalo profile error:", error);

    return { error: errorResponse("zalo_verify_failed", "Không xác thực được tài khoản Zalo.", 401) };
  }

  const user = await findOrCreateZaloUser(profile);

  if (!user) {
    return { error: errorResponse("user_failed", "Không thể tạo tài khoản từ Zalo.", 500) };
  }

  return { user };
}

/**
 * Mini App gọi sau khi người dùng bấm "Xác nhận đăng nhập" (hoặc "Hủy bỏ").
 *
 * Server tự kiểm chứng accessToken với Zalo rồi tạo phiên trong user_sessions và gắn
 * session token vào ticket. Mini App không nhận session token — trình duyệt đã tạo mã QR
 * mới đổi được nó ở bước claim bên website.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ConfirmBody;
    const ticket = normalizeTicket(body.ticket);

    if (!ticket) {
      return withMiniAppCors(errorResponse("invalid_ticket", "Mã QR không hợp lệ.", 400), request);
    }

    const ticketResult = await resolveActionableTicket(ticket);

    if ("error" in ticketResult) {
      return withMiniAppCors(ticketResult.error, request);
    }

    const row = ticketResult.ticket;

    // Người dùng bấm "Hủy bỏ" trong Mini App.
    if (body.decision === "reject") {
      await cancelTicket(row.id);

      return withMiniAppCors(NextResponse.json({ status: "cancelled" }), request);
    }

    const userResult = await resolveUserFromZalo(body);

    if ("error" in userResult) {
      return withMiniAppCors(userResult.error, request);
    }

    const user = userResult.user;

    if (["inactive", "banned"].includes(user.status)) {
      await cancelTicket(row.id);

      return withMiniAppCors(errorResponse("account_disabled", "Tài khoản hiện không thể đăng nhập.", 403), request);
    }

    const result = await confirmTicketLogin(row, user);

    if (!result.ok) {
      return withMiniAppCors(errorResponse("expired", "Mã QR không còn hiệu lực.", 409), request);
    }

    return withMiniAppCors(
      NextResponse.json({
        status: "confirmed",
        user: {
          displayName: resolveDisplayName(user),
          avatarUrl: user.avatar_url,
        },
      }),
      request,
    );
  } catch (error) {
    console.error("Zalo QR confirm error:", error);

    return withMiniAppCors(NextResponse.json({ message: "Không thể xác nhận đăng nhập." }, { status: 500 }), request);
  }
}
