/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/srx/product-tags/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tải ảnh thành phần lên");
  }

  return String(result.url ?? "");
}

export function TagImageField({
  disabled,
  onChange,
  onUploadingChange,
  value,
}: {
  disabled: boolean;
  onChange: (nextValue: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  value: string;
}) {
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    onUploadingChange(isUploading);
  }, [isUploading, onUploadingChange]);

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadFile(files[0]);
      onChange(url);
      toast.success("Đã tải ảnh thành phần");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thành phần");
    } finally {
      setIsUploading(false);

      if (inputReference.current) {
        inputReference.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label htmlFor="product-tag-image">Ảnh thành phần</Label>
        <Input
          id="product-tag-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/products/..."
          disabled={disabled || isUploading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputReference}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleImageUpload(event.target.files)}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => inputReference.current?.click()}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {isUploading ? "Đang tải..." : "Tải ảnh nên"}
        </Button>

        {value ? (
          <Button type="button" variant="ghost" disabled={disabled || isUploading} onClick={() => onChange("")}>
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
    </div>
  );
}
