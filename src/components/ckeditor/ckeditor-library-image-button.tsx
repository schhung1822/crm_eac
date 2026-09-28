"use client";

import * as React from "react";

import type { ClassicEditor } from "ckeditor5";
import { Images } from "lucide-react";

import {
  MediaLibraryPickerDialog,
  type MediaLibraryUploadTarget,
} from "@/app/(main)/srx/media-library/_components/media-library-picker-dialog";
import { Button } from "@/components/ui/button";

/** Nút chèn ảnh từ thư viện vào vị trí con trỏ của CKEditor (chọn được nhiều ảnh một lần). */
export function CkeditorLibraryImageButton({
  disabled,
  editorReference,
  uploadTarget,
}: {
  disabled: boolean;
  editorReference: React.RefObject<ClassicEditor | null>;
  uploadTarget: MediaLibraryUploadTarget;
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  function insertImages(urls: string[]) {
    const editor = editorReference.current;

    if (!editor || urls.length === 0) {
      return;
    }

    editor.execute("insertImage", { source: urls });
    editor.editing.view.focus();
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setIsPickerOpen(true)}>
          <Images className="size-4" />
          Chèn ảnh từ thư viện
        </Button>
      </div>

      <MediaLibraryPickerDialog
        multiple
        uploadTarget={uploadTarget}
        open={isPickerOpen}
        title="Chèn ảnh vào nội dung"
        onOpenChange={setIsPickerOpen}
        onConfirm={insertImages}
      />
    </>
  );
}
