import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Chiều rộng bản mobile theo từng loại ảnh. Các con số này bám theo vị trí hiển
 * thị nhỏ nhất của ảnh trên website để giảm dung lượng tải về (PageSpeed).
 */
export const MOBILE_IMAGE_WIDTHS = {
  banner: 960,
  news: 480,
  product: 480,
  productTag: 240,
} as const;

export type MobileImageKind = keyof typeof MOBILE_IMAGE_WIDTHS;

/** Hậu tố gắn vào tên file của bản mobile: abc.webp -> abc-mb.webp. */
export const MOBILE_IMAGE_SUFFIX = "-mb";

const WEBP_QUALITY = 78;
const publicRoot = path.join(process.cwd(), "public");
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
// Ảnh vector luôn sắc nét ở mọi kích thước nên không cần bản nhỏ hơn.
const SKIPPED_EXTENSIONS = new Set([".svg", ".ico"]);

function splitAssetUrl(value: string): { base: string; query: string } {
  const queryIndex = value.search(/[?#]/);

  return queryIndex === -1
    ? { base: value, query: "" }
    : { base: value.slice(0, queryIndex), query: value.slice(queryIndex) };
}

/** Ghép hậu tố -mb vào tên file nhưng giữ nguyên dạng URL gốc (tuyệt đối hoặc tương đối). */
export function buildMobileImageUrl(imageUrl: string): string {
  const { base, query } = splitAssetUrl(imageUrl);
  const separatorIndex = Math.max(base.lastIndexOf("/"), base.lastIndexOf("\\"));
  const directory = base.slice(0, separatorIndex + 1);
  const filename = base.slice(separatorIndex + 1);
  const dotIndex = filename.lastIndexOf(".");
  const name = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
  const extension = dotIndex === -1 ? "" : filename.slice(dotIndex);

  return `${directory}${name}${MOBILE_IMAGE_SUFFIX}${extension}${query}`;
}

/** Nhận biết URL vốn đã trỏ tới bản mobile để không tạo ra abc-mb-mb.webp. */
export function isMobileImageUrl(imageUrl: string | null | undefined): boolean {
  const { base } = splitAssetUrl(String(imageUrl ?? "").trim());
  const extension = path.posix.extname(base);
  const name = extension ? base.slice(0, -extension.length) : base;

  return name.endsWith(MOBILE_IMAGE_SUFFIX);
}

/** Lấy phần đường dẫn của asset, bỏ qua domain nếu URL ở dạng tuyệt đối. */
function toAssetPathname(imageUrl: string): string | null {
  const { base } = splitAssetUrl(imageUrl);

  if (!base) {
    return null;
  }

  if (!ABSOLUTE_URL_PATTERN.test(base) && !base.startsWith("//")) {
    return decodeURIComponent(base.startsWith("/") ? base : `/${base}`);
  }

  try {
    return decodeURIComponent(new URL(base.startsWith("//") ? `https:${base}` : base).pathname);
  } catch {
    return null;
  }
}

/** Đổi đường dẫn công khai thành file trong public/, chặn mọi đường dẫn thoát ra ngoài. */
function toLocalFilePath(pathname: string): string | null {
  const resolvedPath = path.resolve(path.join(publicRoot, pathname));

  return resolvedPath.startsWith(`${publicRoot}${path.sep}`) ? resolvedPath : null;
}

/** Đường dẫn file trong `public/` ứng với một URL asset, hoặc null nếu nằm ngoài server. */
export function resolveLocalAssetPath(imageUrl: string | null | undefined): string | null {
  const pathname = toAssetPathname(String(imageUrl ?? "").trim());

  return pathname ? toLocalFilePath(pathname) : null;
}

/** Ghi file theo kiểu ghi tạm rồi rename để request khác không đọc phải file dở dang. */
async function writeFileAtomically(filepath: string, buffer: Buffer): Promise<void> {
  const temporaryPath = `${filepath}.${randomUUID()}.tmp`;

  // Đường dẫn được dựng từ thư mục public và tên file của asset đã kiểm tra.
  /* eslint-disable security/detect-non-literal-fs-filename */
  try {
    await writeFile(temporaryPath, buffer);
    await rename(temporaryPath, filepath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  /* eslint-enable security/detect-non-literal-fs-filename */
}

/**
 * Thu nhỏ ảnh về đúng chiều rộng yêu cầu. Trả về null khi ảnh vốn đã nhỏ hơn mốc
 * đó, vì tạo thêm file chỉ làm nặng thư mục mà không tiết kiệm được byte nào.
 */
export async function createMobileImageBuffer(
  buffer: Buffer,
  { width, extension = "" }: { width: number; extension?: string },
): Promise<Buffer | null> {
  if (SKIPPED_EXTENSIONS.has(extension.toLowerCase())) {
    return null;
  }

  try {
    // animated: true để giữ toàn bộ khung hình của ảnh động (gif, apng, webp động).
    const source = sharp(buffer, { animated: true });
    const metadata = await source.metadata();

    if (metadata.width <= width) {
      return null;
    }

    const resized = source.resize({ width, withoutEnlargement: true });

    return extension.toLowerCase() === ".webp"
      ? await resized.webp({ quality: WEBP_QUALITY }).toBuffer()
      : await resized.toBuffer();
  } catch (error) {
    console.error("Không thể tạo bản mobile của ảnh:", error);

    return null;
  }
}

type EnsureMobileImageOptions = {
  /** Tạo lại file kể cả khi bản mobile đã tồn tại và còn mới hơn ảnh gốc. */
  force?: boolean;
};

/** Bản mobile còn dùng được khi nó tồn tại và không cũ hơn ảnh gốc. */
async function isFreshMobileFile(sourcePath: string, mobilePath: string): Promise<boolean> {
  if (!existsSync(mobilePath)) {
    return false;
  }

  try {
    // Cả hai đường dẫn đều đã được giới hạn trong thư mục public.
    /* eslint-disable security/detect-non-literal-fs-filename */
    const [sourceStats, mobileStats] = await Promise.all([stat(sourcePath), stat(mobilePath)]);
    /* eslint-enable security/detect-non-literal-fs-filename */

    return mobileStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
}

type MobileVariantPlan = {
  mobilePath: string;
  mobileUrl: string;
  sourcePath: string;
};

/** Xác định vị trí file gốc và file mobile; null khi ảnh không nằm trong public/. */
function planMobileVariant(imageUrl: string): MobileVariantPlan | null {
  const sourcePath = resolveLocalAssetPath(imageUrl);
  const mobileUrl = buildMobileImageUrl(imageUrl);
  const mobilePath = resolveLocalAssetPath(mobileUrl);

  if (!sourcePath || !mobilePath || !existsSync(sourcePath)) {
    return null;
  }

  return { mobilePath, mobileUrl, sourcePath };
}

/**
 * Bảo đảm bản mobile của imageUrl tồn tại trong public/ và trả về URL của nó.
 *
 * Trả về null khi không tạo được: ảnh nằm ngoài server, file gốc đã bị xoá, hoặc
 * ảnh gốc vốn đã nhỏ hơn mốc mobile. Khi đó phía hiển thị dùng lại ảnh gốc.
 */
export async function ensureMobileImageVariant(
  imageUrl: string | null | undefined,
  kind: MobileImageKind,
  { force = false }: EnsureMobileImageOptions = {},
): Promise<string | null> {
  const trimmedUrl = String(imageUrl ?? "").trim();

  if (!trimmedUrl) {
    return null;
  }

  // Ảnh được chọn vốn đã là bản mobile, dùng lại chính nó.
  if (isMobileImageUrl(trimmedUrl)) {
    return trimmedUrl;
  }

  const plan = planMobileVariant(trimmedUrl);

  if (!plan) {
    return null;
  }

  if (!force && (await isFreshMobileFile(plan.sourcePath, plan.mobilePath))) {
    return plan.mobileUrl;
  }

  // Đường dẫn đã được giới hạn bên trong thư mục public ở toLocalFilePath.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const sourceBuffer = await readFile(plan.sourcePath);
  const mobileBuffer = await createMobileImageBuffer(sourceBuffer, {
    width: MOBILE_IMAGE_WIDTHS[kind],
    extension: path.extname(plan.sourcePath),
  });

  if (!mobileBuffer) {
    return null;
  }

  await writeFileAtomically(plan.mobilePath, mobileBuffer);

  return plan.mobileUrl;
}

/** Tạo bản mobile cho một danh sách ảnh, giữ nguyên thứ tự đầu vào. */
export async function ensureMobileImageVariants(
  imageUrls: readonly (string | null | undefined)[],
  kind: MobileImageKind,
  options?: EnsureMobileImageOptions,
): Promise<(string | null)[]> {
  return Promise.all(imageUrls.map((imageUrl) => ensureMobileImageVariant(imageUrl, kind, options)));
}

/**
 * Ghi thêm bản mobile ngay cạnh file vừa upload và trả về tên file của nó. Dùng
 * cho các route upload, nơi buffer ảnh gốc đã có sẵn nên không cần đọc lại đĩa.
 */
export async function writeMobileImageVariant(
  buffer: Buffer,
  filepath: string,
  kind: MobileImageKind,
): Promise<string | null> {
  const mobileBuffer = await createMobileImageBuffer(buffer, {
    width: MOBILE_IMAGE_WIDTHS[kind],
    extension: path.extname(filepath),
  });

  if (!mobileBuffer) {
    return null;
  }

  const mobilePath = buildMobileImageUrl(filepath);

  await writeFileAtomically(mobilePath, mobileBuffer);

  return path.basename(mobilePath);
}
