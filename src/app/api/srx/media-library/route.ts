import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import {
  createSrxMediaLibraryItem,
  deleteSrxMediaLibraryItem,
  getSrxMediaLibrarySnapshot,
  updateSrxMediaLibraryItem,
} from "@/lib/srx-media-library";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const deletePayloadSchema = z.object({
  relative_path: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý thư viện ảnh");

    if (accessError) {
      return accessError;
    }

    const snapshot = await getSrxMediaLibrarySnapshot();

    return NextResponse.json(snapshot);
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải thư viện ảnh");
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tải ảnh lên thư viện");

    if (accessError) {
      return accessError;
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const directory = String(formData.get("directory") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Chưa chọn file ảnh" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "File tải lên phải là ảnh" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Ảnh vượt quá 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await createSrxMediaLibraryItem({
      directory,
      originalFilename: file.name,
      buffer,
    });

    return NextResponse.json({
      message: "Đã tải ảnh lên thư viện",
      item,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải ảnh lên thư viện");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền cập nhật thư viện ảnh");

    if (accessError) {
      return accessError;
    }

    const item = await updateSrxMediaLibraryItem(await request.json());

    return NextResponse.json({
      message: "Đã cập nhật ảnh",
      item,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật ảnh");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xóa ảnh khỏi thư viện");

    if (accessError) {
      return accessError;
    }

    const payload = deletePayloadSchema.parse(await request.json());
    await deleteSrxMediaLibraryItem(payload.relative_path);

    return NextResponse.json({
      message: "Đã xóa ảnh",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa ảnh");
  }
}
