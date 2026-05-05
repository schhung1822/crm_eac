import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxProduct, parseSrxProductInput, updateSrxProduct } from "@/lib/srx-products";

const paramsSchema = z.object({
  productId: z.string().regex(/^\d+$/),
});

async function resolveProductId(context: {
  params: Promise<{ productId: string }>;
}): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).productId;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý sản phẩm website");

    if (accessError) {
      return accessError;
    }

    const productId = await resolveProductId(context);
    const payload = parseSrxProductInput(await request.json());
    const product = await updateSrxProduct(productId, payload);

    if (!product) {
      return NextResponse.json({ message: "Không tìm thấy sản phẩm" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật sản phẩm",
      product,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật sản phẩm");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý sản phẩm website");

    if (accessError) {
      return accessError;
    }

    const productId = await resolveProductId(context);
    await deleteSrxProduct(productId);

    return NextResponse.json({
      message: "Đã xóa sản phẩm",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa sản phẩm");
  }
}
