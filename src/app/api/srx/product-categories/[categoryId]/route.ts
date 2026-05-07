import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxProductCategory, parseSrxProductCategoryInput, updateSrxProductCategory } from "@/lib/srx-products";

const paramsSchema = z.object({
  categoryId: z.string().regex(/^\d+$/),
});

async function resolveCategoryId(context: {
  params: Promise<{ categoryId: string }>;
}): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).categoryId;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý danh mục sản phẩm");

    if (accessError) {
      return accessError;
    }

    const categoryId = await resolveCategoryId(context);
    const payload = parseSrxProductCategoryInput(await request.json());
    const category = await updateSrxProductCategory(categoryId, payload);

    if (!category) {
      return NextResponse.json({ message: "Không tìm thấy danh mục sản phẩm" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật danh mục sản phẩm",
      category,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật danh mục sản phẩm");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý danh mục sản phẩm");

    if (accessError) {
      return accessError;
    }

    const categoryId = await resolveCategoryId(context);
    await deleteSrxProductCategory(categoryId);

    return NextResponse.json({
      message: "Đã xóa danh mục sản phẩm",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa danh mục sản phẩm");
  }
}

