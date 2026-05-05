import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxNewsTag, parseSrxNewsTagInput, updateSrxNewsTag } from "@/lib/srx-news";

const paramsSchema = z.object({
  tagId: z.string().regex(/^\d+$/),
});

async function resolveTagId(context: { params: Promise<{ tagId: string }> }): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).tagId;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ tagId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý thẻ tin tức");

    if (accessError) {
      return accessError;
    }

    const tagId = await resolveTagId(context);
    const payload = parseSrxNewsTagInput(await request.json());
    const tag = await updateSrxNewsTag(tagId, payload);

    if (!tag) {
      return NextResponse.json({ message: "Không tìm thấy thẻ tin tức" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật thẻ tin tức",
      tag,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật thẻ tin tức");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ tagId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý thẻ tin tức");

    if (accessError) {
      return accessError;
    }

    const tagId = await resolveTagId(context);
    await deleteSrxNewsTag(tagId);

    return NextResponse.json({
      message: "Đã xóa thẻ tin tức",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa thẻ tin tức");
  }
}
