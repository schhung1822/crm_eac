/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { ImagePlus, Images, Star, Trash2, X } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PickerTarget = "thumbnail" | "info" | "gallery";

const pickerTitles: Record<PickerTarget, string> = {
  thumbnail: "Chọn ảnh đại diện",
  info: "Chọn ảnh thông tin",
  gallery: "Thêm ảnh vào album",
};

function SingleImageField({
  alt,
  disabled,
  id,
  label,
  onPick,
  onValueChange,
  value,
}: {
  alt: string;
  disabled: boolean;
  id: string;
  label: string;
  onPick: () => void;
  onValueChange: (nextValue: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="/upload/product/..."
        disabled={disabled}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={onPick}>
          <Images className="size-4" />
          Chọn ảnh
        </Button>

        {value ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => onValueChange("")}>
            <X className="size-4" />
            Bỏ ảnh
          </Button>
        ) : null}
      </div>

      {value ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onPick}
          title="Đổi ảnh"
          className="overflow-hidden rounded-lg border"
        >
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt={alt} className="h-full w-full object-cover" />
          </div>
        </button>
      ) : null}
    </div>
  );
}

export function ProductMediaFields({
  disabled,
  galleryImageUrls,
  infoImageUrl,
  onGalleryImageUrlsChange,
  onInfoImageUrlChange,
  onThumbnailUrlChange,
  thumbnailUrl,
}: {
  disabled: boolean;
  galleryImageUrls: string[];
  infoImageUrl: string;
  onGalleryImageUrlsChange: (nextValue: string[]) => void;
  onInfoImageUrlChange: (nextValue: string) => void;
  onThumbnailUrlChange: (nextValue: string) => void;
  thumbnailUrl: string;
}) {
  const [pickerTarget, setPickerTarget] = React.useState<PickerTarget | null>(null);
  // Giữ tiêu đề khi hộp thoại đang đóng dần, tránh chữ bị đổi giữa hiệu ứng.
  const [lastPickerTarget, setLastPickerTarget] = React.useState<PickerTarget>("thumbnail");

  const normalizedGalleryImageUrls = React.useMemo(() => {
    const seen = new Set<string>();

    return galleryImageUrls.filter((imageUrl) => {
      const normalizedUrl = imageUrl.trim();

      if (!normalizedUrl || seen.has(normalizedUrl)) {
        return false;
      }

      seen.add(normalizedUrl);
      return true;
    });
  }, [galleryImageUrls]);

  function openPicker(target: PickerTarget) {
    setLastPickerTarget(target);
    setPickerTarget(target);
  }

  function handlePickerConfirm(urls: string[]) {
    switch (pickerTarget) {
      case "thumbnail":
        onThumbnailUrlChange(urls[0] ?? "");
        break;
      case "info":
        onInfoImageUrlChange(urls[0] ?? "");
        break;
      case "gallery":
        onGalleryImageUrlsChange([...normalizedGalleryImageUrls, ...urls]);
        break;
      default:
        break;
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <SingleImageField
          alt="Ảnh đại diện sản phẩm"
          disabled={disabled}
          id="product-thumbnail-url"
          label="Ảnh đại diện"
          onPick={() => openPicker("thumbnail")}
          onValueChange={onThumbnailUrlChange}
          value={thumbnailUrl}
        />

        <SingleImageField
          alt="Ảnh thông tin sản phẩm"
          disabled={disabled}
          id="product-info-image-url"
          label="Ảnh thông tin"
          onPick={() => openPicker("info")}
          onValueChange={onInfoImageUrlChange}
          value={infoImageUrl}
        />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1">
            <Label>Album ảnh</Label>
            <p className="text-muted-foreground text-xs">Chọn từ thư viện hoặc tải ảnh mới vào `upload/product`.</p>
          </div>

          <Button type="button" variant="outline" disabled={disabled} onClick={() => openPicker("gallery")}>
            <ImagePlus className="size-4" />
            Thêm ảnh
          </Button>
        </div>

        {normalizedGalleryImageUrls.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
            Chưa có ảnh nào trong album.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {normalizedGalleryImageUrls.map((imageUrl) => (
              <div key={imageUrl} className="overflow-hidden rounded-lg border">
                <div className="bg-muted/40 flex aspect-[4/3] items-center justify-center">
                  <img src={imageUrl} alt="Ảnh album sản phẩm" className="h-full w-full object-cover" />
                </div>
                <div className="grid gap-2 border-t p-3">
                  <div className="text-muted-foreground line-clamp-2 text-xs break-all">{imageUrl}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onThumbnailUrlChange(imageUrl)}
                    >
                      <Star className="size-4" />
                      Làm ảnh đại diện
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        onGalleryImageUrlsChange(normalizedGalleryImageUrls.filter((item) => item !== imageUrl))
                      }
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaLibraryPickerDialog
        uploadTarget="product"
        open={pickerTarget !== null}
        multiple={lastPickerTarget === "gallery"}
        title={pickerTitles[lastPickerTarget]}
        onConfirm={handlePickerConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setPickerTarget(null);
          }
        }}
      />
    </div>
  );
}
