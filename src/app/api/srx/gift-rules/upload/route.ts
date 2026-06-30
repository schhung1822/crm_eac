import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getSafeExtension(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  return extension || ".png";
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tải ảnh quà tặng SRX");

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

    const filename = `${Date.now()}-${randomUUID()}${getSafeExtension(file.name)}`;
    const uploadDir = path.join(process.cwd(), "public", "upload", "gift");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filepath, buffer);

    return NextResponse.json({
      message: "Đã tải ảnh quà tặng lên",
      url: resolveSiteAssetUrl(`/upload/gift/${filename}`),
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải ảnh quà tặng");
  }
}
