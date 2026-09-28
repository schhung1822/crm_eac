/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Images, Trash2 } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AiImageDialog } from "./ai-image-dialog";

export function NewsFeaturedImageField({
  disabled,
  onChange,
  value,
  aiContext,
}: {
  disabled: boolean;
  onChange: (nextValue: string) => void;
  value: string;
  /** Ngữ cảnh bài viết để nút tạo ảnh AI vẽ đúng chủ đề. */
  aiContext?: { title: string; excerpt?: string; content?: string };
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Input
          id="news-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/ports/..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setIsPickerOpen(true)}>
          <Images className="size-4" />
          Chọn ảnh đại diện
        </Button>

        {aiContext ? (
          <AiImageDialog
            title={aiContext.title}
            excerpt={aiContext.excerpt}
            content={aiContext.content}
            onUseAsFeatured={onChange}
            disabled={disabled}
          />
        ) : null}

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
            <img src={value} alt="Ảnh đại diện bài viết" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}

      <MediaLibraryPickerDialog
        uploadTarget="news"
        open={isPickerOpen}
        title="Chọn ảnh đại diện bài viết"
        onOpenChange={setIsPickerOpen}
        onConfirm={(urls) => onChange(urls[0] ?? "")}
      />
    </div>
  );
}
