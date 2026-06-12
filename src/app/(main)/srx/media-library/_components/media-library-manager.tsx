/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import Link from "next/link";

import {
  Copy,
  ExternalLink,
  FolderOpen,
  Loader2,
  PencilLine,
  RefreshCcw,
  Search,
  TriangleAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { filterBySearchTerm } from "@/lib/search-utils";
import {
  parseSrxMediaLibrarySnapshot,
  srxMediaLibraryDefaultDirectories,
  type SrxMediaLibraryItem,
  type SrxMediaLibrarySnapshot,
} from "@/lib/srx-media-library.shared";

function getDirectoryLabel(value: string): string {
  switch (value) {
    case "product":
      return "Ảnh sản phẩm";
    case "products":
      return "Ảnh thành phần";
    case "banner":
      return "Banner";
    case "ports":
      return "Tin tức";
    case "events":
      return "Sự kiện";
    case "":
      return "Gốc upload";
    default:
      return value;
  }
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getApiErrorMessage(result: unknown, fallbackMessage: string): string {
  if (!result || typeof result !== "object") {
    return fallbackMessage;
  }

  const message = "message" in result && typeof result.message === "string" ? result.message : "";

  if ("issues" in result && Array.isArray(result.issues) && result.issues.length > 0) {
    const issueSummary = result.issues
      .map((issue) => {
        if (!issue || typeof issue !== "object" || !("message" in issue) || typeof issue.message !== "string") {
          return "";
        }

        return issue.message;
      })
      .filter(Boolean)
      .join("\n");

    if (issueSummary) {
      return message ? `${message}\n${issueSummary}` : issueSummary;
    }
  }

  return message || fallbackMessage;
}

async function fetchSnapshot(): Promise<SrxMediaLibrarySnapshot> {
  const response = await fetch("/api/srx/media-library", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, "Không thể tải thư viện ảnh"));
  }

  return parseSrxMediaLibrarySnapshot(result);
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
  const [editingFilename, setEditingFilename] = React.useState("");
  const [editingDirectory, setEditingDirectory] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState("");
  const fileInputReference = React.useRef<HTMLInputElement | null>(null);
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const availableDirectories = React.useMemo(() => {
    if (directories.length > 0) {
      return directories;
    }

    return [...srxMediaLibraryDefaultDirectories];
  }, [directories]);

  const directoryCounts = React.useMemo(() => {
    const countMap = new Map<string, number>();

    for (const item of items) {
      const key = item.top_level_directory;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
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

  async function refreshSnapshot() {
    try {
      setIsRefreshing(true);
      const snapshot = await fetchSnapshot();

      React.startTransition(() => {
        setItems(snapshot.items);
        setDirectories(snapshot.directories);

        if (selectedDirectory !== "all" && !snapshot.directories.includes(selectedDirectory)) {
          setSelectedDirectory("all");
        }

        if (!snapshot.directories.includes(uploadDirectory)) {
          setUploadDirectory(snapshot.directories[0] ?? srxMediaLibraryDefaultDirectories[0]);
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thư viện ảnh");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploading(true);

      const uploadResults = await Promise.allSettled(
        Array.from(files).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("directory", uploadDirectory);

          const response = await fetch("/api/srx/media-library", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(getApiErrorMessage(result, `Không thể tải ảnh ${file.name}`));
          }

          return result;
        }),
      );

      const successCount = uploadResults.filter((result) => result.status === "fulfilled").length;
      const failedCount = uploadResults.length - successCount;

      if (successCount > 0) {
        await refreshSnapshot();
      }

      if (successCount > 0 && failedCount === 0) {
        toast.success(`Đã tải ${successCount} ảnh vào ${getDirectoryLabel(uploadDirectory)}`);
        return;
      }

      if (successCount > 0) {
        toast.error(`Đã tải ${successCount}/${uploadResults.length} ảnh. ${failedCount} ảnh còn lại bị lỗi.`);
        return;
      }

      const firstFailure = uploadResults.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      throw firstFailure?.reason ?? new Error("Không thể tải ảnh lên thư viện");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh lên thư viện");
    } finally {
      setIsUploading(false);

      if (fileInputReference.current) {
        fileInputReference.current.value = "";
      }
    }
  }

  function openEditDialog(item: SrxMediaLibraryItem) {
    setEditingItem(item);
    setEditingFilename(item.filename);
    setEditingDirectory(item.top_level_directory || availableDirectories[0] || srxMediaLibraryDefaultDirectories[0]);
  }

  async function handleSaveEdit() {
    if (!editingItem) {
      return;
    }

    try {
      setIsSavingEdit(true);

      const response = await fetch("/api/srx/media-library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          relative_path: editingItem.relative_path,
          next_directory: editingDirectory,
          next_filename: editingFilename,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, "Không thể cập nhật ảnh"));
      }

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
    if (!window.confirm(`Xóa ảnh "${item.filename}" khỏi thư viện?`)) {
      return;
    }

    try {
      setDeletingPath(item.relative_path);

      const response = await fetch("/api/srx/media-library", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          relative_path: item.relative_path,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, "Không thể xóa ảnh"));
      }

      toast.success("Đã xóa ảnh");
      await refreshSnapshot();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa ảnh");
    } finally {
      setDeletingPath("");
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error(`Không thể sao chép ${label}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/srx/products">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Thư viện ảnh</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Thư viện ảnh</h1>
        </div>
      </div>
      <Card>
        <CardContent className="grid gap-4 pt-2">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-2 xl:min-w-[700px] xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="grid gap-2">
                <Label htmlFor="media-search">Tìm ảnh</Label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="media-search"
                    className="pl-10"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm theo tên file, thư mục, đường dẫn..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="media-upload-directory">Tải ảnh vào thư mục</Label>
                <Select value={uploadDirectory} onValueChange={setUploadDirectory} disabled={isUploading}>
                  <SelectTrigger id="media-upload-directory" className="w-full">
                    <SelectValue placeholder="Chọn thư mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDirectories.map((directory) => (
                      <SelectItem key={directory} value={directory}>
                        {getDirectoryLabel(directory)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputReference}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files)}
              />

              <Button type="button" variant="outline" disabled={isRefreshing} onClick={() => void refreshSnapshot()}>
                {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                {isRefreshing ? "Đang tải..." : "Làm mới"}
              </Button>

              <Button type="button" disabled={isUploading} onClick={() => fileInputReference.current?.click()}>
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {isUploading ? "Đang tải..." : "Tải ảnh lên"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{items.length} ảnh</Badge>
            <Badge variant="outline">{availableDirectories.length} thư mục</Badge>
            <Badge variant="outline">Thư mục hiện tại: {getDirectoryLabel(uploadDirectory)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedDirectory} onValueChange={setSelectedDirectory}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="all" className="flex-none">
            Tất cả
            <span className="text-muted-foreground text-xs">{items.length}</span>
          </TabsTrigger>
          {availableDirectories.map((directory) => (
            <TabsTrigger key={directory} value={directory} className="flex-none">
              {getDirectoryLabel(directory)}
              <span className="text-muted-foreground text-xs">{directoryCounts.get(directory) ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedDirectory} className="mt-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <FolderOpen className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <div className="font-medium">Chưa có ảnh trong bộ lọc hiện tại</div>
                  <p className="text-muted-foreground text-sm">
                    Hãy tải thêm ảnh mới hoặc chuyển sang thư mục khác để xem nội dung.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xs:grid-cols-4 2xl:grid-cols-5">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden py-0">
                  <div className="bg-muted/40 aspect-square overflow-hidden">
                    <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
                  </div>

                  <CardContent className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant="outline">{getDirectoryLabel(item.top_level_directory)}</Badge>
                      <span className="text-muted-foreground text-xs">{formatBytes(item.size_bytes)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="line-clamp-2 font-medium break-all">{item.filename}</div>
                      <div className="text-muted-foreground text-xs">{item.modified_at.toLocaleString("vi-VN")}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void copyToClipboard(item.url, "URL ảnh")}
                      >
                        <Copy className="size-4" />
                        Copy URL
                      </Button>

                      <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                        <PencilLine className="size-4" />
                        Sửa
                      </Button>

                      <Button type="button" variant="ghost" size="sm" asChild>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" />
                          Mở
                        </a>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingPath === item.relative_path}
                        onClick={() => void handleDelete(item)}
                      >
                        {deletingPath === item.relative_path ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Xóa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật ảnh</DialogTitle>
            <DialogDescription>
              Đổi tên file hoặc chuyển ảnh sang thư mục upload khác. Liên kết cũ sẽ không tự động được cập nhật ở các
              module đang dùng ảnh này.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="media-edit-directory">Thư mục</Label>
              <Select value={editingDirectory} onValueChange={setEditingDirectory} disabled={isSavingEdit}>
                <SelectTrigger id="media-edit-directory" className="w-full">
                  <SelectValue placeholder="Chọn thư mục đích" />
                </SelectTrigger>
                <SelectContent>
                  {availableDirectories.map((directory) => (
                    <SelectItem key={directory} value={directory}>
                      {getDirectoryLabel(directory)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="media-edit-filename">Tên file</Label>
              <Input
                id="media-edit-filename"
                value={editingFilename}
                onChange={(event) => setEditingFilename(event.target.value)}
                placeholder="vd: hero-banner.webp"
                disabled={isSavingEdit}
              />
            </div>

            {editingItem ? (
              <div className="text-muted-foreground rounded-lg border px-3 py-2 text-xs break-all">
                Đường dẫn hiện tại: {editingItem.relative_path}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)} disabled={isSavingEdit}>
              Hủy
            </Button>
            <Button type="button" onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
              {isSavingEdit ? <Loader2 className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
              {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
