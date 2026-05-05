import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { parseSrxOrderUpdateInput, updateSrxOrder } from "@/lib/srx-orders";

const paramsSchema = z.object({
  orderId: z.string().regex(/^\d+$/),
});

async function resolveOrderId(context: {
  params: Promise<{ orderId: string }>;
}): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).orderId;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý đơn hàng website");

    if (accessError) {
      return accessError;
    }

    const currentUser = await getCurrentUser();
    const orderId = await resolveOrderId(context);
    const payload = parseSrxOrderUpdateInput(await request.json());
    const order = await updateSrxOrder(orderId, payload, currentUser?.userId ?? null);

    if (!order) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật đơn hàng",
      order,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật đơn hàng");
  }
}
