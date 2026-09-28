/* eslint-disable @next/next/no-img-element */
"use client";

import { Check, Images, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SrxMediaLibraryItem } from "@/lib/srx-media-library.shared";

function PickerTile({
  item,
  onDoubleClick,
  onToggle,
  selectedOrder,
  showOrder,
}: {
  item: SrxMediaLibraryItem;
  onDoubleClick: () => void;
  onToggle: () => void;
  selectedOrder: number;
  showOrder: boolean;
}) {
  const isSelected = selectedOrder > 0;

  return (
    <button
      type="button"
      title={item.relative_path}
      aria-pressed={isSelected}
      onClick={onToggle}
      onDoubleClick={onDoubleClick}
      className={`group bg-card focus-visible:ring-ring/50 relative overflow-hidden rounded-lg border text-left transition-shadow outline-none focus-visible:ring-[3px] ${
        isSelected ? "border-primary ring-primary ring-2" : "hover:shadow-md"
      }`}
    >
      <div className="bg-muted/40 aspect-square overflow-hidden">
        <img
          src={item.mobile_url || item.url}
          alt={item.filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {isSelected ? (
        <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold shadow-sm">
          {showOrder ? selectedOrder : <Check className="size-3.5" />}
        </span>
      ) : null}

      <span className="block truncate border-t px-2 py-1.5 text-[11px]">{item.filename}</span>
    </button>
  );
}

export function PickerGrid({
  filteredItems,
  isLibraryEmpty,
  isLoading,
  multiple,
  onConfirm,
  onShowMore,
  onToggle,
  selectedUrls,
  visibleCount,
}: {
  filteredItems: SrxMediaLibraryItem[];
  isLibraryEmpty: boolean;
  isLoading: boolean;
  multiple: boolean;
  onConfirm: (urls: string[]) => void;
  onShowMore: () => void;
  onToggle: (url: string) => void;
  selectedUrls: string[];
  visibleCount: number;
}) {
  if (isLoading && isLibraryEmpty) {
    return (
      <div className="text-muted-foreground flex h-60 items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Đang tải thư viện ảnh...
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-muted-foreground flex h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm">
        <Images className="size-7" />
        {isLibraryEmpty ? "Thư viện chưa có ảnh nào" : "Không có ảnh khớp bộ lọc"}
      </div>
    );
  }

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hiddenCount = filteredItems.length - visibleItems.length;

  return (
    <div className="grid gap-4 pb-1">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {visibleItems.map((item) => (
          <PickerTile
            key={item.id}
            item={item}
            selectedOrder={selectedUrls.indexOf(item.url) + 1}
            showOrder={multiple}
            onToggle={() => onToggle(item.url)}
            onDoubleClick={() => {
              // Chọn một ảnh: nhấp đúp để dùng luôn, không cần bấm nút xác nhận.
              if (!multiple) {
                onConfirm([item.url]);
              }
            }}
          />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <Button type="button" variant="outline" className="justify-self-center" onClick={onShowMore}>
          Xem thêm ({hiddenCount} ảnh)
        </Button>
      ) : null}
    </div>
  );
}
