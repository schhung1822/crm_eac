import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tải banner SRX");

    if (accessError) {
      return accessError;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Chưa chọn file ảnh" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "File tải lên phải là ảnh" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Ảnh vượt quá 10MB" }, { status: 400 });
    }

    const extension = path.extname(file.name) || ".png";
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "upload", "banner");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);

    // filepath được ghép từ thư mục upload cố định của dự án và tên file tự sinh.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filepath, buffer);

    return NextResponse.json({
      message: "Đã tải banner lên",
      url: resolveSiteAssetUrl(`/upload/banner/${filename}`),
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải banner");
  }
}

