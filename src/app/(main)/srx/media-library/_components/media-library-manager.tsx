"use client";

import * as React from "react";

import { FolderOpen, Images } from "lucide-react";
import { toast } from "sonner";

import { filterBySearchTerm } from "@/lib/search-utils";
import {
  srxMediaLibraryDefaultDirectories,
  type SrxMediaLibraryItem,
  type SrxMediaLibrarySnapshot,
} from "@/lib/srx-media-library.shared";

import { MediaLibraryCard } from "./media-library-card";
import { MediaLibraryDeleteDialog } from "./media-library-delete-dialog";
import { MediaLibraryEditDialog } from "./media-library-edit-dialog";
import { MediaLibraryFilters } from "./media-library-filters";
import { MediaLibraryHeader } from "./media-library-header";
import {
  deleteMediaItem,
  fetchSnapshot,
  getDirectoryLabel,
  renameMediaItem,
  uploadMediaFile,
} from "./media-library-utils";

function MediaLibraryEmptyState({ isLibraryEmpty }: { isLibraryEmpty: boolean }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
      {isLibraryEmpty ? <Images className="size-8" /> : <FolderOpen className="size-8" />}
      <p className="text-foreground text-sm font-medium">
        {isLibraryEmpty ? "Thư viện chưa có ảnh nào" : "Không có ảnh khớp bộ lọc"}
      </p>
      <p className="text-xs">
        {isLibraryEmpty ? "Tải ảnh lên để bắt đầu." : "Thử từ khóa khác hoặc chọn thư mục khác."}
      </p>
    </div>
  );
}

export function MediaLibraryManager({ initialSnapshot }: { initialSnapshot: SrxMediaLibrarySnapshot }) {
  const [items, setItems] = React.useState(initialSnapshot.items);
  const [directories, setDirectories] = React.useState(initialSnapshot.directories);
  const [selectedDirectory, setSelectedDirectory] = React.useState("all");
  const [uploadDirectory, setUploadDirectory] = React.useState(
    initialSnapshot.directories[0] ?? srxMediaLibraryDefaultDirectories[0],
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SrxMediaLibraryItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<SrxMediaLibraryItem | null>(null);
  const [deletingPath, setDeletingPath] = React.useState("");
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const availableDirectories = React.useMemo(
    () => (directories.length > 0 ? directories : [...srxMediaLibraryDefaultDirectories]),
    [directories],
  );

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

    return filterBySearchTerm(itemsByDirectory, deferredSearchTerm, (item) => [
      item.filename,
      item.directory,
      item.relative_path,
      item.url,
    ]);
  }, [deferredSearchTerm, items, selectedDirectory]);

  const refreshSnapshot = React.useCallback(async () => {
    try {
      setIsRefreshing(true);
      const snapshot = await fetchSnapshot();

      React.startTransition(() => {
        setItems(snapshot.items);
        setDirectories(snapshot.directories);
        setSelectedDirectory((current) =>
          current !== "all" && !snapshot.directories.includes(current) ? "all" : current,
        );
        setUploadDirectory((current) =>
          snapshot.directories.includes(current)
            ? current
            : (snapshot.directories[0] ?? srxMediaLibraryDefaultDirectories[0]),
        );
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thư viện ảnh");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  function reportUploadResult(results: readonly PromiseSettledResult<void>[]) {
    const successCount = results.filter((result) => result.status === "fulfilled").length;

    if (successCount === results.length) {
      toast.success(`Đã tải ${successCount} ảnh vào ${getDirectoryLabel(uploadDirectory)}`);
      return;
    }

    const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    const failureMessage =
      firstFailure?.reason instanceof Error ? firstFailure.reason.message : "Không thể tải ảnh lên thư viện";

    toast.error(successCount > 0 ? `Đã tải ${successCount}/${results.length} ảnh. ${failureMessage}` : failureMessage);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsUploading(true);
    const results = await Promise.allSettled(Array.from(files).map((file) => uploadMediaFile(file, uploadDirectory)));

    reportUploadResult(results);
    await refreshSnapshot();
    setIsUploading(false);
  }

  async function handleSaveEdit(payload: { nextDirectory: string; nextFilename: string }) {
    if (!editingItem) {
      return;
    }

    try {
      setIsSavingEdit(true);
      await renameMediaItem({ ...payload, relativePath: editingItem.relative_path });
      toast.success("Đã cập nhật ảnh");
      setEditingItem(null);
      await refreshSnapshot();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật ảnh");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(item: SrxMediaLibraryItem) {
    try {
      setPendingDelete(null);
      setDeletingPath(item.relative_path);
      toast.success(await deleteMediaItem(item.relative_path));
      await refreshSnapshot();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa ảnh");
    } finally {
      setDeletingPath("");
    }
  }

  async function copyUrl(item: SrxMediaLibraryItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("Đã sao chép URL ảnh");
    } catch {
      toast.error("Không thể sao chép URL ảnh");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <MediaLibraryHeader
        directories={availableDirectories}
        isRefreshing={isRefreshing}
        isUploading={isUploading}
        itemCount={items.length}
        uploadDirectory={uploadDirectory}
        onRefresh={() => void refreshSnapshot()}
        onUpload={(files) => void handleUpload(files)}
        onUploadDirectoryChange={setUploadDirectory}
      />

      <MediaLibraryFilters
        directories={availableDirectories}
        directoryCounts={directoryCounts}
        itemCount={items.length}
        searchTerm={searchTerm}
        selectedDirectory={selectedDirectory}
        onSearchTermChange={setSearchTerm}
        onSelectedDirectoryChange={setSelectedDirectory}
      />

      {filteredItems.length === 0 ? (
        <MediaLibraryEmptyState isLibraryEmpty={items.length === 0} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredItems.map((item) => (
            <MediaLibraryCard
              key={item.id}
              item={item}
              isDeleting={deletingPath === item.relative_path}
              onCopyUrl={(target) => void copyUrl(target)}
              onDelete={setPendingDelete}
              onEdit={setEditingItem}
            />
          ))}
        </div>
      )}

      <MediaLibraryEditDialog
        directories={availableDirectories}
        isSaving={isSavingEdit}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(payload) => void handleSaveEdit(payload)}
      />

      <MediaLibraryDeleteDialog
        item={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(item) => void handleDelete(item)}
      />
    </div>
  );
}
