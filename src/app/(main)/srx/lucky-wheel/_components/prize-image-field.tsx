/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Images, Trash2 } from "lucide-react";

import { MediaLibraryPickerDialog } from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PrizeImageField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label htmlFor="prize-image">Ảnh phần thưởng</Label>
        <Input
          id="prize-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/gift/..."
          disabled={disabled}
        />
        <p className="text-muted-foreground text-xs">
          Ảnh tỷ lệ 4:5 (vd. 800×1000px) – hiển thị như một thẻ đứng trên vòng quay.
        </p>
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
        <div className="bg-muted/50 aspect-[4/5] w-40 overflow-hidden rounded-lg border">
          <img src={value} alt="Ảnh phần thưởng" className="size-full object-cover" />
        </div>
      ) : null}

      <MediaLibraryPickerDialog
        uploadTarget="gift"
        open={isPickerOpen}
        title="Chọn ảnh phần thưởng"
        onOpenChange={setIsPickerOpen}
        onConfirm={(urls) => onChange(urls[0] ?? "")}
      />
    </div>
  );
}
