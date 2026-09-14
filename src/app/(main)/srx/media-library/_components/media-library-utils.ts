import { parseSrxMediaLibrarySnapshot, type SrxMediaLibrarySnapshot } from "@/lib/srx-media-library.shared";

const DIRECTORY_LABELS: Record<string, string> = {
  "": "Gốc upload",
  banner: "Banner",
  events: "Sự kiện",
  ports: "Tin tức",
  product: "Ảnh sản phẩm",
  products: "Ảnh thành phần",
};

export function getDirectoryLabel(value: string): string {
  return DIRECTORY_LABELS[value] ?? value;
}

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatModifiedAt(value: Date): string {
  return value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function readIssueMessages(result: Record<string, unknown>): string {
  if (!Array.isArray(result.issues)) {
    return "";
  }

  return result.issues
    .map((issue) =>
      issue && typeof issue === "object" && "message" in issue && typeof issue.message === "string"
        ? issue.message
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

export function getApiErrorMessage(result: unknown, fallbackMessage: string): string {
  if (!result || typeof result !== "object") {
    return fallbackMessage;
  }

  const payload = result as Record<string, unknown>;
  const message = typeof payload.message === "string" ? payload.message : "";
  const issueSummary = readIssueMessages(payload);

  if (issueSummary) {
    return message ? `${message}\n${issueSummary}` : issueSummary;
  }

  return message || fallbackMessage;
}

export async function fetchSnapshot(): Promise<SrxMediaLibrarySnapshot> {
  const response = await fetch("/api/srx/media-library", { cache: "no-store" });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, "Không thể tải thư viện ảnh"));
  }

  return parseSrxMediaLibrarySnapshot(result);
}

export async function uploadMediaFile(file: File, directory: string): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("directory", directory);

  const response = await fetch("/api/srx/media-library", { method: "POST", body: formData });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, `Không thể tải ảnh ${file.name}`));
  }
}

export async function renameMediaItem(payload: {
  nextDirectory: string;
  nextFilename: string;
  relativePath: string;
}): Promise<void> {
  const response = await fetch("/api/srx/media-library", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relative_path: payload.relativePath,
      next_directory: payload.nextDirectory,
      next_filename: payload.nextFilename,
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, "Không thể cập nhật ảnh"));
  }
}

export async function deleteMediaItem(relativePath: string): Promise<string> {
  const response = await fetch("/api/srx/media-library", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relative_path: relativePath }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, "Không thể xóa ảnh"));
  }

  return getApiErrorMessage(result, "Đã xóa ảnh");
}
