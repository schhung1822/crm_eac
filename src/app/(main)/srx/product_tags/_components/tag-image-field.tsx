/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Images, Trash2 } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TagImageField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (nextValue: string) => void;
  value: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label htmlFor="product-tag-image">Ảnh thành phần</Label>
        <Input
          id="product-tag-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/products/..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setIsPickerOpen(true)}>
          <Images className="size-4" />
          Chọn ảnh
        </Button>

        {value ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange("")}>
            <Trash2 className="size-4" />
            Xóa ảnh
          </Button>
        ) : null}
      </div>

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt="Ảnh thành phần" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}

      <MediaLibraryPickerDialog
        uploadTarget="productTag"
        open={isPickerOpen}
        title="Chọn ảnh thành phần"
        onOpenChange={setIsPickerOpen}
        onConfirm={(urls) => onChange(urls[0] ?? "")}
      />
    </div>
  );
}
