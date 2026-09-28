/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Images, Trash2 } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const imageGridClass = "grid grid-cols-2 gap-4 max-[520px]:grid-cols-1";

function BannerImageField({
  disabled,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  value: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label>{label}</Label>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setIsPickerOpen(true)}>
          <Images className="size-4" />
          Chọn ảnh
        </Button>

        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>
            <Trash2 className="size-4" />
            Xóa
          </Button>
        ) : null}
      </div>

      {value ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsPickerOpen(true)}
          title="Đổi ảnh"
          className="overflow-hidden rounded-lg border"
        >
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt={label} className="h-full w-full object-cover" />
          </div>
        </button>
      ) : null}

      <MediaLibraryPickerDialog
        uploadTarget="banner"
        open={isPickerOpen}
        title={`Chọn ${label.toLowerCase()}`}
        onOpenChange={setIsPickerOpen}
        onConfirm={(urls) => onChange(urls[0] ?? "")}
      />
    </div>
  );
}

export function BannerImageFields({
  disabled,
  imageUrl,
  mobileImageUrl,
  onImageUrlChange,
  onMobileImageUrlChange,
}: {
  disabled: boolean;
  imageUrl: string;
  mobileImageUrl: string;
  onImageUrlChange: (nextValue: string) => void;
  onMobileImageUrlChange: (nextValue: string) => void;
}) {
  return (
    <div className={imageGridClass}>
      <BannerImageField
        disabled={disabled}
        label="Ảnh desktop"
        value={imageUrl}
        onChange={onImageUrlChange}
        placeholder="/upload/banner/..."
      />

      <BannerImageField
        disabled={disabled}
        label="Ảnh mobile"
        value={mobileImageUrl}
        onChange={onMobileImageUrlChange}
        placeholder="/upload/banner/..."
      />
    </div>
  );
}
