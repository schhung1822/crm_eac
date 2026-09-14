"use client";

import * as React from "react";

import { Loader2, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SrxMediaLibraryItem } from "@/lib/srx-media-library.shared";

import { getDirectoryLabel } from "./media-library-utils";

type MediaLibraryEditDialogProps = {
  directories: readonly string[];
  isSaving: boolean;
  item: SrxMediaLibraryItem | null;
  onClose: () => void;
  onSave: (payload: { nextDirectory: string; nextFilename: string }) => void;
};

export function MediaLibraryEditDialog({ directories, isSaving, item, onClose, onSave }: MediaLibraryEditDialogProps) {
  const [filename, setFilename] = React.useState("");
  const [directory, setDirectory] = React.useState("");

  React.useEffect(() => {
    if (item) {
      setFilename(item.filename);
      setDirectory(item.top_level_directory || (directories[0] ?? ""));
    }
  }, [directories, item]);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật ảnh</DialogTitle>
          <DialogDescription>
            Đổi tên file hoặc chuyển ảnh sang thư mục khác. Bản mobile sinh kèm sẽ đi theo ảnh gốc, nhưng liên kết cũ ở
            các module đang dùng ảnh này không tự cập nhật.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="media-edit-directory">Thư mục</Label>
            <Select value={directory} onValueChange={setDirectory} disabled={isSaving}>
              <SelectTrigger id="media-edit-directory" className="w-full">
                <SelectValue placeholder="Chọn thư mục đích" />
              </SelectTrigger>
              <SelectContent>
                {directories.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getDirectoryLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="media-edit-filename">Tên file</Label>
            <Input
              id="media-edit-filename"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="vd: hero-banner.webp"
              disabled={isSaving}
            />
          </div>

          {item ? (
            <div className="text-muted-foreground bg-muted/40 rounded-lg border px-3 py-2 text-xs break-all">
              {item.relative_path}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => onSave({ nextDirectory: directory, nextFilename: filename })}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
