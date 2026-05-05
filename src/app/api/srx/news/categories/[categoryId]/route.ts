import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxNewsCategory, parseSrxNewsCategoryInput, updateSrxNewsCategory } from "@/lib/srx-news";

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
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý danh mục tin tức");

    if (accessError) {
      return accessError;
    }

    const categoryId = await resolveCategoryId(context);
    const payload = parseSrxNewsCategoryInput(await request.json());
    const category = await updateSrxNewsCategory(categoryId, payload);

    if (!category) {
      return NextResponse.json({ message: "Không tìm thấy danh mục tin tức" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật danh mục tin tức",
      category,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật danh mục tin tức");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý danh mục tin tức");

    if (accessError) {
      return accessError;
    }

    const categoryId = await resolveCategoryId(context);
    await deleteSrxNewsCategory(categoryId);

    return NextResponse.json({
      message: "Đã xóa danh mục tin tức",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa danh mục tin tức");
  }
}
