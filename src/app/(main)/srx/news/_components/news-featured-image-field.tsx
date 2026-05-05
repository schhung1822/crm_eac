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

  const response = await fetch("/api/srx/news/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tải ảnh bài viết lên");
  }

  return String(result.url ?? "");
}

export function NewsFeaturedImageField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (nextValue: string) => void;
  value: string;
}) {
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadFile(files[0]);
      onChange(url);
      toast.success("Đã tải ảnh đại diện bài viết");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh đại diện bài viết");
    } finally {
      setIsUploading(false);

      if (inputReference.current) {
        inputReference.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="news-image">Ảnh đại diện</Label>
        <Input
          id="news-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/ports/..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputReference}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleUpload(event.target.files)}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => inputReference.current?.click()}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {isUploading ? "Đang tải..." : "Tải ảnh đại diện"}
        </Button>

        {value ? (
          <Button type="button" variant="ghost" disabled={disabled || isUploading} onClick={() => onChange("")}>
            <Trash2 className="size-4" />
            Xóa ảnh
          </Button>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">Ảnh sẽ được lưu trong thư mục `upload/ports`.</p>

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt="Ảnh đại diện bài viết" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
