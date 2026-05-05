import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxNewsPost, parseSrxNewsPostInput, updateSrxNewsPost } from "@/lib/srx-news";

const paramsSchema = z.object({
  postId: z.string().regex(/^\d+$/),
});

async function resolvePostId(context: { params: Promise<{ postId: string }> }): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).postId;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý tin tức website");

    if (accessError) {
      return accessError;
    }

    const postId = await resolvePostId(context);
    const payload = parseSrxNewsPostInput(await request.json());
    const post = await updateSrxNewsPost(postId, payload);

    if (!post) {
      return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật bài viết",
      post,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật bài viết");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess("Bạn không có quyền quản lý tin tức website");

    if (accessError) {
      return accessError;
    }

    const postId = await resolvePostId(context);
    await deleteSrxNewsPost(postId);

    return NextResponse.json({
      message: "Đã xóa bài viết",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa bài viết");
  }
}
