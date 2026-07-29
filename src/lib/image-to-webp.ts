import "server-only";

import path from "node:path";

import sharp from "sharp";

export const WEBP_EXTENSION = ".webp";

const WEBP_QUALITY = 82;

// Ảnh vector và icon giữ nguyên định dạng gốc vì rasterize sang webp sẽ mất chất lượng khi phóng to.
const PASSTHROUGH_EXTENSIONS = new Set([".svg", ".ico"]);
const PASSTHROUGH_MIME_TYPES = new Set(["image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]);

export type WebpConversionResult = {
  buffer: Buffer;
  /** Đuôi file nên dùng khi ghi xuống đĩa, luôn bắt đầu bằng dấu chấm. */
  extension: string;
  /** true khi buffer đã thực sự được encode lại sang webp. */
  converted: boolean;
};

function normalizeExtension(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  return extension || ".png";
}

function shouldPassThrough(extension: string, mimeType: string): boolean {
  return PASSTHROUGH_EXTENSIONS.has(extension) || PASSTHROUGH_MIME_TYPES.has(mimeType.toLowerCase());
}

/**
 * Chuyển buffer ảnh sang webp. Nếu ảnh không encode được (file hỏng, định dạng lạ)
 * thì giữ nguyên buffer gốc để việc tải lên không bị gãy.
 */
export async function convertImageBufferToWebp(
  buffer: Buffer,
  { filename = "", mimeType = "" }: { filename?: string; mimeType?: string } = {},
): Promise<WebpConversionResult> {
  const originalExtension = normalizeExtension(filename);

  if (shouldPassThrough(originalExtension, mimeType)) {
    return { buffer, extension: originalExtension, converted: false };
  }

  if (originalExtension === WEBP_EXTENSION) {
    // Đã là webp, encode lại chỉ làm giảm chất lượng.
    return { buffer, extension: WEBP_EXTENSION, converted: false };
  }

  try {
    // animated: true để giữ toàn bộ khung hình của ảnh động (gif, apng).
    const webpBuffer = await sharp(buffer, { animated: true }).webp({ quality: WEBP_QUALITY }).toBuffer();

    return { buffer: webpBuffer, extension: WEBP_EXTENSION, converted: true };
  } catch (error) {
    console.error("Không thể chuyển ảnh sang webp, giữ nguyên định dạng gốc:", error);

    return { buffer, extension: originalExtension, converted: false };
  }
}

/** Đọc file upload và chuyển sang webp. */
export async function convertUploadedImageToWebp(file: File): Promise<WebpConversionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return convertImageBufferToWebp(buffer, { filename: file.name, mimeType: file.type });
}

/** Ghép tên file mới dựa trên đuôi đã chuyển đổi. */
export function replaceExtension(filename: string, extension: string): string {
  const currentExtension = path.extname(filename);

  return `${path.basename(filename, currentExtension)}${extension}`;
}
