import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { convertUploadedImageToWebp } from "@/lib/image-to-webp";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Convert to webp and generate unique filename
    const { buffer, extension } = await convertUploadedImageToWebp(file);
    const timestamp = Date.now();
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}${extension}`;

    // Create images directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Return the public URL
    const url = resolveSiteAssetUrl(`/images/${filename}`);

    return NextResponse.json({ url, success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
