/* eslint-disable @next/next/no-img-element */
"use client";

import { Copy, ExternalLink, Loader2, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SrxMediaLibraryItem } from "@/lib/srx-media-library.shared";

import { formatBytes, formatModifiedAt, getDirectoryLabel } from "./media-library-utils";

type MediaLibraryCardProps = {
  isDeleting: boolean;
  item: SrxMediaLibraryItem;
  onCopyUrl: (item: SrxMediaLibraryItem) => void;
  onDelete: (item: SrxMediaLibraryItem) => void;
  onEdit: (item: SrxMediaLibraryItem) => void;
};

// Trên máy tính các nút chỉ hiện khi rê chuột; màn hình nhỏ không có hover nên luôn hiện.
const overlayButtonClassName = "bg-background/85 hover:bg-background size-7 rounded-md shadow-sm backdrop-blur-sm";

export function MediaLibraryCard({ isDeleting, item, onCopyUrl, onDelete, onEdit }: MediaLibraryCardProps) {
  return (
    <figure className="group bg-card relative overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
      <div className="bg-muted/40 aspect-square overflow-hidden">
        <img
          src={item.url}
          alt={item.filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={overlayButtonClassName}
          title="Sao chép URL"
          aria-label={`Sao chép URL của ${item.filename}`}
          onClick={() => onCopyUrl(item)}
        >
          <Copy className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={overlayButtonClassName}
          title="Mở ảnh trong tab mới"
          aria-label={`Mở ${item.filename}`}
          asChild
        >
          <a href={item.url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={overlayButtonClassName}
          title="Đổi tên hoặc chuyển thư mục"
          aria-label={`Sửa ${item.filename}`}
          onClick={() => onEdit(item)}
        >
          <PencilLine className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={`${overlayButtonClassName} text-destructive hover:text-destructive`}
          title="Xóa ảnh"
          aria-label={`Xóa ${item.filename}`}
          disabled={isDeleting}
          onClick={() => onDelete(item)}
        >
          {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>

      <figcaption className="grid gap-0.5 border-t px-2.5 py-2">
        <span className="truncate text-xs font-medium" title={item.filename}>
          {item.filename}
        </span>
        <span className="text-muted-foreground truncate text-[11px]">
          {getDirectoryLabel(item.top_level_directory)} · {formatBytes(item.size_bytes)} ·{" "}
          {formatModifiedAt(item.modified_at)}
        </span>
      </figcaption>
    </figure>
  );
}
