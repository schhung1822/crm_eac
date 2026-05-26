import { z } from "zod";

function normalizePathCandidate(value: string): string {
  return value.replace(/\\/g, "/").trim();
}

function isValidDirectorySegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function isValidFilename(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function isValidRelativeDirectory(value: string): boolean {
  const normalizedValue = normalizePathCandidate(value).replace(/^\/+|\/+$/g, "");

  if (!normalizedValue) {
    return true;
  }

  return normalizedValue
    .split("/")
    .every((segment) => segment !== "." && segment !== ".." && isValidDirectorySegment(segment));
}

function isValidRelativePath(value: string): boolean {
  const normalizedValue = normalizePathCandidate(value).replace(/^\/+|\/+$/g, "");

  if (!normalizedValue) {
    return false;
  }

  const segments = normalizedValue.split("/");
  const filename = segments.pop() ?? "";

  if (!filename || filename === "." || filename === ".." || !isValidFilename(filename)) {
    return false;
  }

  return segments.every((segment) => segment !== "." && segment !== ".." && isValidDirectorySegment(segment));
}

export const srxMediaLibraryDefaultDirectories = ["product", "products", "banner", "ports", "events"] as const;

export const srxMediaLibraryItemSchema = z.object({
  id: z.string(),
  relative_path: z.string(),
  directory: z.string(),
  top_level_directory: z.string(),
  filename: z.string(),
  url: z.string(),
  size_bytes: z.number().int().nonnegative(),
  modified_at: z.coerce.date(),
});

export const srxMediaLibrarySnapshotSchema = z.object({
  directories: z.array(z.string()),
  items: z.array(srxMediaLibraryItemSchema),
});

export const srxMediaLibraryUpdateInputSchema = z.object({
  relative_path: z
    .string()
    .trim()
    .min(1)
    .max(260)
    .refine(isValidRelativePath, "Đường dẫn ảnh không hợp lệ"),
  next_directory: z
    .string()
    .trim()
    .max(160)
    .optional()
    .default("")
    .refine(isValidRelativeDirectory, "Thư mục đích không hợp lệ"),
  next_filename: z.string().trim().min(1).max(160),
});

export type SrxMediaLibraryItem = z.infer<typeof srxMediaLibraryItemSchema>;
export type SrxMediaLibrarySnapshot = z.infer<typeof srxMediaLibrarySnapshotSchema>;
export type SrxMediaLibraryUpdateInput = z.infer<typeof srxMediaLibraryUpdateInputSchema>;

export function parseSrxMediaLibraryItem(input: unknown): SrxMediaLibraryItem {
  return srxMediaLibraryItemSchema.parse(input);
}

export function parseSrxMediaLibrarySnapshot(input: unknown): SrxMediaLibrarySnapshot {
  return srxMediaLibrarySnapshotSchema.parse(input);
}

export function parseSrxMediaLibraryUpdateInput(input: unknown): SrxMediaLibraryUpdateInput {
  return srxMediaLibraryUpdateInputSchema.parse(input);
}
