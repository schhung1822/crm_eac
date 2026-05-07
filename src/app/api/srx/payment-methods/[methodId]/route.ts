import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxPaymentMethod, parseSrxPaymentMethodInput, updateSrxPaymentMethod } from "@/lib/srx-website";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phương thức thanh toán SRX");

    if (accessError) {
      return accessError;
    }

    const { methodId } = await params;
    const payload = parseSrxPaymentMethodInput(await request.json());
    const paymentMethod = await updateSrxPaymentMethod(methodId, payload);

    if (!paymentMethod) {
      return NextResponse.json({ message: "Không tìm thấy phương thức thanh toán" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật phương thức thanh toán",
      paymentMethod,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật phương thức thanh toán");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý phương thức thanh toán SRX");

    if (accessError) {
      return accessError;
    }

    const { methodId } = await params;
    await deleteSrxPaymentMethod(methodId);

    return NextResponse.json({
      message: "Đã xóa phương thức thanh toán",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa phương thức thanh toán");
  }
}

