import { NextRequest, NextResponse } from "next/server";

import { findTicket, isTicketExpired, markTicketScanned, normalizeTicket } from "@/lib/srx-zalo-login";
import { handleMiniAppPreflight, withMiniAppCors } from "@/lib/srx-zalo-login-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return handleMiniAppPreflight(request);
}

/**
 * Mini App gọi ngay khi được mở từ mã QR, để website đổi trạng thái sang
 * "đã quét, đang chờ xác nhận trên điện thoại".
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { ticket?: unknown };
    const ticket = normalizeTicket(body.ticket);

    if (!ticket) {
      return withMiniAppCors(
        NextResponse.json({ code: "invalid_ticket", message: "Mã QR không hợp lệ." }, { status: 400 }),
        request,
      );
    }

    const row = await findTicket(ticket);

    if (!row || isTicketExpired(row)) {
      return withMiniAppCors(
        NextResponse.json({ code: "expired", message: "Mã QR đã hết hạn." }, { status: 410 }),
        request,
      );
    }

    if (!["pending", "scanned"].includes(row.status)) {
      return withMiniAppCors(
        NextResponse.json({ code: row.status, message: "Mã QR không còn hiệu lực." }, { status: 409 }),
        request,
      );
    }

    await markTicketScanned(row.id);

    return withMiniAppCors(
      NextResponse.json({ status: "scanned", expiresInSeconds: Number(row.expires_in_seconds) }),
      request,
    );
  } catch (error) {
    console.error("Zalo QR scan error:", error);

    return withMiniAppCors(NextResponse.json({ message: "Không thể xử lý mã QR." }, { status: 500 }), request);
  }
}
