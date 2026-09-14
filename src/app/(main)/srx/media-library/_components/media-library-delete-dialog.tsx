"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SrxMediaLibraryItem } from "@/lib/srx-media-library.shared";

type MediaLibraryDeleteDialogProps = {
  item: SrxMediaLibraryItem | null;
  onCancel: () => void;
  onConfirm: (item: SrxMediaLibraryItem) => void;
};

function describeDeletion(item: SrxMediaLibraryItem | null): string {
  const scope = item?.mobile_url ? "Ảnh gốc và bản thu nhỏ sinh kèm" : "Ảnh này";

  return `${scope} sẽ bị xóa khỏi server. Các module đang dùng ảnh sẽ mất ảnh và thao tác không thể hoàn tác.`;
}

export function MediaLibraryDeleteDialog({ item, onCancel, onConfirm }: MediaLibraryDeleteDialogProps) {
  return (
    <AlertDialog open={item !== null} onOpenChange={(open) => (open ? null : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-all">Xóa ảnh {item?.filename}?</AlertDialogTitle>
          <AlertDialogDescription>{describeDeletion(item)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => item && onConfirm(item)}>Xóa</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
