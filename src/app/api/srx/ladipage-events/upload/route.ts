import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
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

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền tải ảnh ladipage sự kiện");

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

    const uploadDir = path.join(process.cwd(), "public", "upload", "events");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const extension = path.extname(file.name) || ".png";
    const rawBaseName = path.basename(file.name, extension);
    const baseName = makeSafeFilename(rawBaseName) || "event-image";

    let filename = `${baseName}${extension}`;
    let counter = 1;

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    while (existsSync(path.join(uploadDir, filename))) {
      filename = `${baseName}-${counter}${extension}`;
      counter++;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(filepath, buffer);

    return NextResponse.json({
      message: "Đã tải ảnh ladipage sự kiện lên",
      url: resolveSiteAssetUrl(`/upload/events/${filename}`),
      filename,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải ảnh ladipage sự kiện");
  }
}

