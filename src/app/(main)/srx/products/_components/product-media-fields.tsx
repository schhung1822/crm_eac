/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { ImagePlus, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/srx/products/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tải ảnh lên");
  }

  return String(result.url ?? "");
}

function SingleImageUploadField({
  alt,
  buttonLabel,
  disabled,
  id,
  inputReference,
  isUploading,
  label,
  onUpload,
  onValueChange,
  value,
}: {
  alt: string;
  buttonLabel: string;
  disabled: boolean;
  id: string;
  inputReference: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  label: string;
  onUpload: (files: FileList | null) => Promise<void>;
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

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputReference}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void onUpload(event.target.files)}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => inputReference.current?.click()}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {isUploading ? "Đang tải..." : buttonLabel}
        </Button>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt={alt} className="h-full w-full object-cover" />
          </div>
        </div>
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
  const thumbnailInputReference = React.useRef<HTMLInputElement | null>(null);
  const infoImageInputReference = React.useRef<HTMLInputElement | null>(null);
  const galleryInputReference = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = React.useState(false);
  const [isUploadingInfoImage, setIsUploadingInfoImage] = React.useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = React.useState(false);

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

  async function handleThumbnailUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploadingThumbnail(true);
      const url = await uploadFile(files[0]);
      onThumbnailUrlChange(url);
      toast.success("Đã tải ảnh đại diện");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh đại diện");
    } finally {
      setIsUploadingThumbnail(false);

      if (thumbnailInputReference.current) {
        thumbnailInputReference.current.value = "";
      }
    }
  }

  async function handleInfoImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploadingInfoImage(true);
      const url = await uploadFile(files[0]);
      onInfoImageUrlChange(url);
      toast.success("Đã tải ảnh thông tin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh thông tin");
    } finally {
      setIsUploadingInfoImage(false);

      if (infoImageInputReference.current) {
        infoImageInputReference.current.value = "";
      }
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploadingGallery(true);
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        uploadedUrls.push(url);
      }

      onGalleryImageUrlsChange([...normalizedGalleryImageUrls, ...uploadedUrls]);
      toast.success(`Đã tải ${uploadedUrls.length} ảnh album`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải album ảnh");
    } finally {
      setIsUploadingGallery(false);

      if (galleryInputReference.current) {
        galleryInputReference.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <SingleImageUploadField
          alt="Ảnh đại diện sản phẩm"
          buttonLabel="Tải ảnh đại diện"
          disabled={disabled}
          id="product-thumbnail-url"
          inputReference={thumbnailInputReference}
          isUploading={isUploadingThumbnail}
          label="Ảnh đại diện"
          onUpload={handleThumbnailUpload}
          onValueChange={onThumbnailUrlChange}
          value={thumbnailUrl}
        />

        <SingleImageUploadField
          alt="Ảnh thông tin sản phẩm"
          buttonLabel="Tải ảnh thông tin"
          disabled={disabled}
          id="product-info-image-url"
          inputReference={infoImageInputReference}
          isUploading={isUploadingInfoImage}
          label="Ảnh thông tin"
          onUpload={handleInfoImageUpload}
          onValueChange={onInfoImageUrlChange}
          value={infoImageUrl}
        />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1">
            <Label>Album ảnh</Label>
            <p className="text-muted-foreground text-xs">Ảnh sẽ được lưu trong `upload/product`.</p>
          </div>

          <input
            ref={galleryInputReference}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void handleGalleryUpload(event.target.files)}
          />

          <Button
            type="button"
            variant="outline"
            disabled={disabled || isUploadingGallery}
            onClick={() => galleryInputReference.current?.click()}
          >
            {isUploadingGallery ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {isUploadingGallery ? "Đang tải..." : "Thêm ảnh"}
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
    </div>
  );
}
