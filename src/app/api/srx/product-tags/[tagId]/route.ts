import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxProductTag, parseSrxProductTagInput, updateSrxProductTag } from "@/lib/srx-products";

const paramsSchema = z.object({
  tagId: z.string().regex(/^\d+$/),
});

async function resolveTagId(context: { params: Promise<{ tagId: string }> }): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).tagId;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ tagId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý từ điển thành phần");

    if (accessError) {
      return accessError;
    }

    const tagId = await resolveTagId(context);
    const payload = parseSrxProductTagInput(await request.json());
    const tag = await updateSrxProductTag(tagId, payload);

    if (!tag) {
      return NextResponse.json({ message: "Không tìm thấy thành phần" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật thành phần",
      tag,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật thành phần");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ tagId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý từ điển thành phần");

    if (accessError) {
      return accessError;
    }

    const tagId = await resolveTagId(context);
    await deleteSrxProductTag(tagId);

    return NextResponse.json({
      message: "Đã xóa thành phần",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa thành phần");
  }
}
