import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxKiotVietOrderSync, previewSrxKiotVietOrder, syncSrxOrderToKiotViet } from "@/lib/srx-kiotviet-orders";

type RouteContext = { params: Promise<{ orderId: string }> };

async function readOrderId({ params }: RouteContext): Promise<string | null> {
  const { orderId } = await params;
  return /^\d+$/.test(orderId) ? orderId : null;
}

/** Xem trước dữ liệu sẽ gửi KiotViet (chỉ đọc, không tạo gì trên KiotViet). */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem đồng bộ KiotViet");

    if (accessError) {
      return accessError;
    }

    const orderId = await readOrderId(context);

    if (!orderId) {
      return NextResponse.json({ message: "ID đơn hàng không hợp lệ" }, { status: 400 });
    }

    const draft = await previewSrxKiotVietOrder(orderId);

    if (!draft) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    return NextResponse.json({ preview: draft });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể dựng dữ liệu gửi KiotViet");
  }
}

/** Gửi (hoặc gửi lại khi lần trước lỗi) đơn lên KiotViet. */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền đồng bộ KiotViet");

    if (accessError) {
      return accessError;
    }

    const orderId = await readOrderId(context);

    if (!orderId) {
      return NextResponse.json({ message: "ID đơn hàng không hợp lệ" }, { status: 400 });
    }

    const outcome = await syncSrxOrderToKiotViet({ id: orderId });
    const sync = await getSrxKiotVietOrderSync(orderId);

    if (outcome.status === "failed") {
      return NextResponse.json({ message: outcome.errorMessage, sync }, { status: 502 });
    }

    const message = outcome.status === "synced" ? `Đã tạo đơn ${outcome.code} trên KiotViet` : outcome.reason;

    return NextResponse.json({ message, sync });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể đồng bộ đơn lên KiotViet");
  }
}
