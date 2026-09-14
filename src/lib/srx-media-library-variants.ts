import "server-only";

import { existsSync } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";

import { buildMobileImageUrl } from "@/lib/image-mobile-variant";

/**
 * Thư viện ảnh chỉ quản lý ảnh gốc. Bản thu nhỏ `-mb` sinh kèm bị ẩn khỏi danh
 * sách và luôn đi theo ảnh gốc khi ảnh gốc đổi tên, chuyển thư mục hoặc bị xóa.
 */

/**
 * Lọc ra những tên file là bản sinh từ một file khác trong cùng thư mục.
 * File `abc-mb.webp` chỉ được coi là bản sinh khi `abc.webp` còn nằm cạnh nó,
 * còn lại vẫn là một ảnh độc lập do người dùng tự đặt tên.
 */
export function collectDerivedFilenames(filenames: readonly string[]): Set<string> {
  const existingFilenames = new Set(filenames);
  const derivedFilenames = new Set<string>();

  for (const filename of filenames) {
    const variantFilename = buildMobileImageUrl(filename);

    if (variantFilename !== filename && existingFilenames.has(variantFilename)) {
      derivedFilenames.add(variantFilename);
    }
  }

  return derivedFilenames;
}

/** Đường dẫn bản mobile của một ảnh, hoặc null khi ảnh chưa có bản mobile. */
export function findMobileVariantPath(absolutePath: string): string | null {
  const variantPath = buildMobileImageUrl(absolutePath);

  // Đường dẫn được dựng từ đường dẫn ảnh gốc đã kiểm tra nằm trong thư mục upload.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return variantPath !== absolutePath && existsSync(variantPath) ? variantPath : null;
}

/** Xóa bản mobile đi kèm ảnh gốc. Trả về số file đã xóa. */
export async function deleteMobileVariant(absolutePath: string): Promise<number> {
  const variantPath = findMobileVariantPath(absolutePath);

  if (!variantPath) {
    return 0;
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await unlink(variantPath);

  return 1;
}

/** Chuyển bản mobile theo ảnh gốc khi ảnh gốc đổi tên hoặc sang thư mục khác. */
export async function moveMobileVariant(currentAbsolutePath: string, nextAbsolutePath: string): Promise<void> {
  const currentVariantPath = findMobileVariantPath(currentAbsolutePath);

  if (!currentVariantPath) {
    return;
  }

  const nextVariantPath = buildMobileImageUrl(nextAbsolutePath);

  if (path.resolve(currentVariantPath).toLowerCase() === path.resolve(nextVariantPath).toLowerCase()) {
    return;
  }

  // Cả hai đường dẫn đều bắt nguồn từ đường dẫn ảnh đã kiểm tra trong thư mục upload.
  /* eslint-disable security/detect-non-literal-fs-filename */
  await mkdir(path.dirname(nextVariantPath), { recursive: true });

  // Bản mobile đang nằm ở đích là file mồ côi của ảnh cũ, ghi đè được.
  if (existsSync(nextVariantPath)) {
    await unlink(nextVariantPath);
  }

  await rename(currentVariantPath, nextVariantPath);
  /* eslint-enable security/detect-non-literal-fs-filename */
}
