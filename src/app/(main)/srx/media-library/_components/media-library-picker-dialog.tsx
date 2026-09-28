"use client";

import * as React from "react";

import { Check, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { filterBySearchTerm } from "@/lib/search-utils";
import type { SrxMediaLibraryItem } from "@/lib/srx-media-library.shared";

import { MediaLibraryFilters } from "./media-library-filters";
import { PickerGrid } from "./media-library-picker-grid";
import { fetchSnapshot, getApiErrorMessage, getDirectoryLabel } from "./media-library-utils";

const PAGE_SIZE = 60;

/**
 * Nơi lưu ảnh tải mới. Dùng route upload riêng của từng loại (không dùng route của thư viện)
 * vì các route này sinh kèm bản mobile như lúc tải ảnh trực tiếp trước đây.
 */
const uploadTargets = {
  product: { directory: "product", endpoint: "/api/srx/products/upload" },
  banner: { directory: "banner", endpoint: "/api/srx/banners/upload" },
  news: { directory: "ports", endpoint: "/api/srx/news/upload" },
  productTag: { directory: "products", endpoint: "/api/srx/product-tags/upload" },
  gift: { directory: "gift", endpoint: "/api/srx/gift-rules/upload" },
} as const;

export type MediaLibraryUploadTarget = keyof typeof uploadTargets;

type UploadedImage = { url: string };

async function uploadImage(file: File, endpoint: string): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, { method: "POST", body: formData });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, `Không thể tải ảnh ${file.name}`));
  }

  return { url: String(result.url ?? "") };
}

/** "https://site/upload/banner/a.webp" hoặc "/upload/banner/a.webp" → "banner/a.webp" để tìm lại trong thư viện. */
function toRelativeUploadPath(url: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const marker = "/upload/";
    const index = pathname.indexOf(marker);

    return index === -1 ? "" : decodeURIComponent(pathname.slice(index + marker.length));
  } catch {
    return "";
  }
}

/** Báo kết quả tải lên qua toast và trả về các ảnh tải thành công. */
function reportUploadResults(results: PromiseSettledResult<UploadedImage>[]): UploadedImage[] {
  const uploadedImages = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (!firstFailure) {
    toast.success(`Đã tải ${uploadedImages.length} ảnh vào thư viện`);
    return uploadedImages;
  }

  const failureMessage = firstFailure.reason instanceof Error ? firstFailure.reason.message : "Không thể tải ảnh";
  toast.error(
    uploadedImages.length > 0
      ? `Đã tải ${uploadedImages.length}/${results.length} ảnh. ${failureMessage}`
      : failureMessage,
  );

  return uploadedImages;
}

export function MediaLibraryPickerDialog({
  multiple = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  uploadTarget,
}: {
  multiple?: boolean;
  onConfirm: (urls: string[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  /** Thư mục lưu ảnh tải mới; cũng là thư mục mở sẵn khi vào hộp thoại. */
  uploadTarget: MediaLibraryUploadTarget;
}) {
  const { directory: uploadDirectory, endpoint: uploadEndpoint } = uploadTargets[uploadTarget];
  const fileInputReference = React.useRef<HTMLInputElement | null>(null);
  const [items, setItems] = React.useState<SrxMediaLibraryItem[]>([]);
  const [directories, setDirectories] = React.useState<string[]>([]);
  const [selectedDirectory, setSelectedDirectory] = React.useState<string>(uploadDirectory);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedUrls, setSelectedUrls] = React.useState<string[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const loadSnapshot = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await fetchSnapshot();

      setItems(snapshot.items);
      setDirectories(snapshot.directories);
      return snapshot.items;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thư viện ảnh");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedUrls([]);
    setSearchTerm("");
    setSelectedDirectory(uploadDirectory);
    setVisibleCount(PAGE_SIZE);
    void loadSnapshot();
  }, [open, loadSnapshot, uploadDirectory]);

  const directoryCounts = React.useMemo(() => {
    const countMap = new Map<string, number>();

    for (const item of items) {
      countMap.set(item.top_level_directory, (countMap.get(item.top_level_directory) ?? 0) + 1);
    }

    return countMap;
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const itemsByDirectory =
      selectedDirectory === "all" ? items : items.filter((item) => item.top_level_directory === selectedDirectory);

    return filterBySearchTerm(itemsByDirectory, deferredSearchTerm, (item) => [item.filename, item.relative_path]);
  }, [deferredSearchTerm, items, selectedDirectory]);

  function toggleUrl(url: string) {
    setSelectedUrls((current) => {
      if (current.includes(url)) {
        return current.filter((item) => item !== url);
      }

      return multiple ? [...current, url] : [url];
    });
  }

  function confirm(urls: string[]) {
    if (urls.length === 0) {
      return;
    }

    onConfirm(urls);
    onOpenChange(false);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsUploading(true);
    const results = await Promise.allSettled(Array.from(files).map((file) => uploadImage(file, uploadEndpoint)));
    const uploadedImages = reportUploadResults(results);

    if (fileInputReference.current) {
      fileInputReference.current.value = "";
    }

    const nextItems = await loadSnapshot();
    setIsUploading(false);

    if (uploadedImages.length === 0) {
      return;
    }

    // Ảnh vừa tải được chọn sẵn; dùng URL của thư viện để khớp với ô đang hiển thị.
    const uploadedUrls = uploadedImages.map(({ url }) => {
      const relativePath = toRelativeUploadPath(url);
      const libraryItem = nextItems?.find((item) => item.relative_path === relativePath);
      return libraryItem?.url ?? url;
    });

    setSelectedDirectory(uploadDirectory);
    setSearchTerm("");
    setSelectedUrls((current) =>
      multiple ? [...current, ...uploadedUrls.filter((url) => !current.includes(url))] : uploadedUrls.slice(-1),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {multiple ? "Chọn một hoặc nhiều ảnh" : "Chọn một ảnh"} từ thư viện, hoặc tải ảnh mới lên (lưu vào{" "}
            {getDirectoryLabel(uploadDirectory)}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputReference}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files)}
          />
          <Button type="button" disabled={isUploading} onClick={() => fileInputReference.current?.click()}>
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {isUploading ? "Đang tải..." : "Tải ảnh mới"}
          </Button>
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => void loadSnapshot()}>
            <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
            Làm mới
          </Button>
        </div>

        <MediaLibraryFilters
          directories={directories}
          directoryCounts={directoryCounts}
          itemCount={items.length}
          searchTerm={searchTerm}
          selectedDirectory={selectedDirectory}
          onSearchTermChange={(value) => {
            setSearchTerm(value);
            setVisibleCount(PAGE_SIZE);
          }}
          onSelectedDirectoryChange={(value) => {
            setSelectedDirectory(value);
            setVisibleCount(PAGE_SIZE);
          }}
        />

        <div className="nice-scroll -mx-1 min-h-60 flex-1 overflow-y-auto px-1">
          <PickerGrid
            filteredItems={filteredItems}
            isLibraryEmpty={items.length === 0}
            isLoading={isLoading}
            multiple={multiple}
            selectedUrls={selectedUrls}
            visibleCount={visibleCount}
            onConfirm={confirm}
            onShowMore={() => setVisibleCount((current) => current + PAGE_SIZE)}
            onToggle={toggleUrl}
          />
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {selectedUrls.length > 0 ? `Đã chọn ${selectedUrls.length} ảnh` : "Chưa chọn ảnh nào"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={selectedUrls.length === 0} onClick={() => confirm(selectedUrls)}>
              <Check className="size-4" />
              Dùng ảnh đã chọn
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
