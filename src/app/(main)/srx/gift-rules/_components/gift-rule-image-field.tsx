/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Images, Trash2 } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GiftRuleImageField({
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
        <Label htmlFor="gift-img">Thumbnail quà tặng</Label>
        <Input
          id="gift-img"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/gift/..."
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
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt="Thumbnail quà tặng" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}

      <MediaLibraryPickerDialog
        uploadTarget="gift"
        open={isPickerOpen}
        title="Chọn thumbnail quà tặng"
        onOpenChange={setIsPickerOpen}
        onConfirm={(urls) => onChange(urls[0] ?? "")}
      />
    </div>
  );
}
