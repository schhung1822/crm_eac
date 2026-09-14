import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { buildMobileImageUrl, writeMobileImageVariant } from "@/lib/image-mobile-variant";
import { convertUploadedImageToWebp } from "@/lib/image-to-webp";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function makeSafeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Tìm tên file chưa bị dùng, tính cả tên bản mobile để không ghi đè ảnh đã có. */
function resolveAvailableFilename(uploadDir: string, baseName: string, extension: string): string {
  let filename = `${baseName}${extension}`;
  let counter = 1;

  while (
    existsSync(path.join(uploadDir, filename)) ||
    existsSync(path.join(uploadDir, buildMobileImageUrl(filename)))
  ) {
    filename = `${baseName}-${counter}${extension}`;
    counter++;
  }

  return filename;
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tải ảnh sản phẩm");

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

    const uploadDir = path.join(process.cwd(), "public", "upload", "product");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const { buffer, extension } = await convertUploadedImageToWebp(file);
    const rawBaseName = path.basename(file.name, path.extname(file.name));
    const baseName = makeSafeFilename(rawBaseName) || "image";

    const filename = resolveAvailableFilename(uploadDir, baseName, extension);

    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Bản mobile dùng cho giao diện nhỏ, tạo ngay lúc upload để không phải resize lúc hiển thị.
    const mobileFilename = await writeMobileImageVariant(buffer, filepath, "product");

    return NextResponse.json({
      message: "Đã tải ảnh lên",
      url: resolveSiteAssetUrl(`/upload/product/${filename}`),
      url_mb: mobileFilename ? resolveSiteAssetUrl(`/upload/product/${mobileFilename}`) : "",
      filename,
    });
  } catch (error) {
    console.error("Upload product image error:", error);

    return buildApiErrorResponse(error, "Không thể tải ảnh sản phẩm");
  }
}
