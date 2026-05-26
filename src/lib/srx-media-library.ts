import "server-only";

import { existsSync } from "node:fs";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  parseSrxMediaLibraryItem,
  parseSrxMediaLibrarySnapshot,
  parseSrxMediaLibraryUpdateInput,
  srxMediaLibraryDefaultDirectories,
  type SrxMediaLibraryItem,
  type SrxMediaLibrarySnapshot,
  type SrxMediaLibraryUpdateInput,
} from "@/lib/srx-media-library.shared";

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const uploadRoot = path.join(process.cwd(), "public", "upload");

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

function trimSlashes(value: string): string {
  return normalizeSlashes(value).replace(/^\/+|\/+$/g, "");
}

function isValidDirectorySegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function isValidFilename(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function ensureInsideUploadRoot(targetPath: string): string {
  const resolvedRoot = path.resolve(uploadRoot);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Đường dẫn ảnh vượt ngoài thư mục upload");
  }

  return resolvedTarget;
}

function normalizeDirectory(value: string): string {
  const normalizedValue = trimSlashes(value);

  if (!normalizedValue) {
    return "";
  }

  const segments = normalizedValue.split("/");

  if (!segments.every((segment) => segment !== "." && segment !== ".." && isValidDirectorySegment(segment))) {
    throw new Error("Thư mục ảnh không hợp lệ");
  }

  return segments.join("/");
}

function normalizeRelativePath(value: string): string {
  const normalizedValue = trimSlashes(value);

  if (!normalizedValue) {
    throw new Error("Đường dẫn ảnh không hợp lệ");
  }

  const segments = normalizedValue.split("/");
  const filename = segments.pop() ?? "";

  if (!filename || filename === "." || filename === ".." || !isValidFilename(filename)) {
    throw new Error("Tên ảnh không hợp lệ");
  }

  if (!segments.every((segment) => segment !== "." && segment !== ".." && isValidDirectorySegment(segment))) {
    throw new Error("Đường dẫn ảnh không hợp lệ");
  }

  return [...segments, filename].join("/");
}

function resolveUploadDirectoryPath(directory: string): string {
  return ensureInsideUploadRoot(path.join(uploadRoot, directory));
}

function resolveUploadFilePath(relativePath: string): string {
  return ensureInsideUploadRoot(path.join(uploadRoot, relativePath));
}

function makeSafeBaseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeExtension(value: string, fallback = ".png"): string {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  const withDot = normalizedValue.startsWith(".") ? normalizedValue : `.${normalizedValue}`;
  return /^\.[a-z0-9]+$/.test(withDot) ? withDot : fallback;
}

function createRelativePath(directory: string, filename: string): string {
  return directory ? path.posix.join(directory, filename) : filename;
}

function createPublicUrl(relativePath: string): string {
  return `/upload/${normalizeSlashes(relativePath)}`;
}

async function ensureUploadRoot(): Promise<void> {
  await mkdir(uploadRoot, { recursive: true });
}

async function createMediaItem(relativePath: string): Promise<SrxMediaLibraryItem> {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const absolutePath = resolveUploadFilePath(normalizedRelativePath);
  const fileStats = await stat(absolutePath);
  const directoryName = path.posix.dirname(normalizedRelativePath);
  const directory = directoryName === "." ? "" : directoryName;
  const topLevelDirectory = directory ? directory.split("/")[0] ?? "" : "";

  return parseSrxMediaLibraryItem({
    id: normalizedRelativePath,
    relative_path: normalizedRelativePath,
    directory,
    top_level_directory: topLevelDirectory,
    filename: path.posix.basename(normalizedRelativePath),
    url: createPublicUrl(normalizedRelativePath),
    size_bytes: fileStats.size,
    modified_at: fileStats.mtime,
  });
}

async function walkDirectory(currentAbsolutePath: string, currentRelativePath: string, items: SrxMediaLibraryItem[]): Promise<void> {
  const entries = await readdir(currentAbsolutePath, { withFileTypes: true });

  for (const entry of entries) {
    const nextRelativePath = currentRelativePath ? path.posix.join(currentRelativePath, entry.name) : entry.name;
    const nextAbsolutePath = path.join(currentAbsolutePath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(nextAbsolutePath, nextRelativePath, items);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    items.push(await createMediaItem(nextRelativePath));
  }
}

export async function getSrxMediaLibrarySnapshot(): Promise<SrxMediaLibrarySnapshot> {
  await ensureUploadRoot();

  const items: SrxMediaLibraryItem[] = [];
  await walkDirectory(uploadRoot, "", items);

  items.sort((left, right) => {
    if (left.modified_at.getTime() !== right.modified_at.getTime()) {
      return right.modified_at.getTime() - left.modified_at.getTime();
    }

    return left.relative_path.localeCompare(right.relative_path);
  });

  const directories = new Set<string>(srxMediaLibraryDefaultDirectories);
  const rootEntries = await readdir(uploadRoot, { withFileTypes: true });

  for (const entry of rootEntries) {
    if (entry.isDirectory() && isValidDirectorySegment(entry.name)) {
      directories.add(entry.name);
    }
  }

  return parseSrxMediaLibrarySnapshot({
    directories: [...directories].sort((left, right) => left.localeCompare(right)),
    items,
  });
}

export async function createSrxMediaLibraryItem({
  directory,
  originalFilename,
  buffer,
}: {
  directory: string;
  originalFilename: string;
  buffer: Buffer;
}): Promise<SrxMediaLibraryItem> {
  await ensureUploadRoot();

  const normalizedDirectory = normalizeDirectory(directory);
  const targetDirectoryPath = resolveUploadDirectoryPath(normalizedDirectory);

  await mkdir(targetDirectoryPath, { recursive: true });

  const originalExtension = path.extname(originalFilename);
  const safeExtension = normalizeExtension(originalExtension, ".png");
  const originalBaseName = path.basename(originalFilename, originalExtension);
  const safeBaseName = makeSafeBaseName(originalBaseName) || "image";

  let nextFilename = `${safeBaseName}${safeExtension}`;
  let suffix = 1;

  while (existsSync(path.join(targetDirectoryPath, nextFilename))) {
    nextFilename = `${safeBaseName}-${suffix}${safeExtension}`;
    suffix += 1;
  }

  const relativePath = createRelativePath(normalizedDirectory, nextFilename);
  const absolutePath = resolveUploadFilePath(relativePath);

  await writeFile(absolutePath, buffer);

  return createMediaItem(relativePath);
}

export async function updateSrxMediaLibraryItem(input: SrxMediaLibraryUpdateInput): Promise<SrxMediaLibraryItem> {
  const payload = parseSrxMediaLibraryUpdateInput(input);
  const currentRelativePath = normalizeRelativePath(payload.relative_path);
  const currentAbsolutePath = resolveUploadFilePath(currentRelativePath);

  let currentFileStats;

  try {
    currentFileStats = await stat(currentAbsolutePath);
  } catch {
    throw new Error("Không tìm thấy ảnh cần cập nhật");
  }

  if (!currentFileStats.isFile()) {
    throw new Error("Không tìm thấy ảnh cần cập nhật");
  }

  const nextDirectory = normalizeDirectory(payload.next_directory);
  const currentFilename = path.posix.basename(currentRelativePath);
  const rawNextExtension = path.extname(payload.next_filename);
  const currentExtension = normalizeExtension(path.extname(currentFilename), ".png");
  const nextExtension = normalizeExtension(rawNextExtension, currentExtension);
  const nextBaseName = makeSafeBaseName(path.basename(payload.next_filename, rawNextExtension || currentExtension)) || "image";
  const nextFilename = `${nextBaseName}${nextExtension}`;
  const nextRelativePath = createRelativePath(nextDirectory, nextFilename);
  const nextAbsolutePath = resolveUploadFilePath(nextRelativePath);

  await mkdir(path.dirname(nextAbsolutePath), { recursive: true });

  const currentResolvedPath = path.resolve(currentAbsolutePath).toLowerCase();
  const nextResolvedPath = path.resolve(nextAbsolutePath).toLowerCase();

  if (currentResolvedPath !== nextResolvedPath && existsSync(nextAbsolutePath)) {
    throw new Error("Tên ảnh đã tồn tại trong thư mục đích");
  }

  await rename(currentAbsolutePath, nextAbsolutePath);

  return createMediaItem(nextRelativePath);
}

export async function deleteSrxMediaLibraryItem(relativePath: string): Promise<void> {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const absolutePath = resolveUploadFilePath(normalizedRelativePath);

  let currentFileStats;

  try {
    currentFileStats = await stat(absolutePath);
  } catch {
    throw new Error("Không tìm thấy ảnh cần xóa");
  }

  if (!currentFileStats.isFile()) {
    throw new Error("Không tìm thấy ảnh cần xóa");
  }

  await unlink(absolutePath);
}
