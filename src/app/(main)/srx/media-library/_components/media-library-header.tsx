"use client";

import * as React from "react";

import Link from "next/link";

import { Loader2, RefreshCcw, Upload } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getDirectoryLabel } from "./media-library-utils";

type MediaLibraryHeaderProps = {
  directories: readonly string[];
  isRefreshing: boolean;
  isUploading: boolean;
  itemCount: number;
  onRefresh: () => void;
  onUpload: (files: FileList | null) => void;
  onUploadDirectoryChange: (value: string) => void;
  uploadDirectory: string;
};

export function MediaLibraryHeader({
  directories,
  isRefreshing,
  isUploading,
  itemCount,
  onRefresh,
  onUpload,
  onUploadDirectoryChange,
  uploadDirectory,
}: MediaLibraryHeaderProps) {
  const fileInputReference = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Thư viện ảnh</h1>
          <p className="text-muted-foreground text-sm">
            {itemCount} ảnh gốc trong {directories.length} thư mục. Bản thu nhỏ sinh kèm được ẩn khỏi danh sách và bị
            xóa cùng ảnh gốc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputReference}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              onUpload(event.target.files);
              event.target.value = "";
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          </Button>

          <Select value={uploadDirectory} onValueChange={onUploadDirectoryChange} disabled={isUploading}>
            <SelectTrigger className="w-[170px]" aria-label="Thư mục sẽ tải ảnh vào">
              <SelectValue placeholder="Chọn thư mục" />
            </SelectTrigger>
            <SelectContent>
              {directories.map((directory) => (
                <SelectItem key={directory} value={directory}>
                  {getDirectoryLabel(directory)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" disabled={isUploading} onClick={() => fileInputReference.current?.click()}>
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {isUploading ? "Đang tải..." : "Tải ảnh lên"}
          </Button>
        </div>
      </div>
    </div>
  );
}
