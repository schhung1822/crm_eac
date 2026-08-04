"use client";

import Link from "next/link";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { SrxLadipageEvent, SrxLadipageEventSettingsInput } from "@/lib/srx-ladipage-events";

export function LadipageEventRowActions({
  event,
  onCopyPublicUrl,
  onDelete,
  onUpdateSettings,
  publicUrl,
}: {
  event: SrxLadipageEvent;
  onCopyPublicUrl: (event: SrxLadipageEvent) => Promise<void>;
  onDelete: (event: SrxLadipageEvent) => Promise<void>;
  onUpdateSettings: (event: SrxLadipageEvent, settings: SrxLadipageEventSettingsInput) => Promise<void>;
  publicUrl: string;
}) {
  return (
    <>
      <DropdownMenuLabel>Ladipage</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={`/srx/ladipage-events/${event.id}/edit`}>Sửa Ladipage</Link>
      </DropdownMenuItem>
      {publicUrl ? (
        <DropdownMenuItem asChild>
          <Link href={publicUrl} target="_blank" rel="noreferrer">
            Mở trang public
          </Link>
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={() => void onCopyPublicUrl(event)}>Sao chép URL public</DropdownMenuItem>

      <DropdownMenuSeparator />
      {event.status === "published" ? (
        <DropdownMenuItem onClick={() => void onUpdateSettings(event, { status: "draft" })}>
          Chuyển về nháp
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => void onUpdateSettings(event, { status: "published", isActive: true })}>
          Xuất bản
        </DropdownMenuItem>
      )}
      {event.status === "published" && event.hasUnpublishedChanges ? (
        <DropdownMenuItem onClick={() => void onUpdateSettings(event, { status: "published" })}>
          Đẩy bản nháp lên public
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={() => void onUpdateSettings(event, { isActive: !event.isActive })}>
        {event.isActive ? "Tắt hiển thị" : "Bật hiển thị"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          const nextSortOrder = window.prompt("Thứ tự hiển thị (số càng nhỏ càng lên trên):", String(event.sortOrder));

          if (nextSortOrder === null) {
            return;
          }

          const parsedSortOrder = Number(nextSortOrder.trim());

          if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
            window.alert("Thứ tự hiển thị phải là số nguyên không âm.");
            return;
          }

          void onUpdateSettings(event, { sortOrder: parsedSortOrder });
        }}
      >
        Đổi thứ tự hiển thị
      </DropdownMenuItem>
      {event.status === "archived" ? null : (
        <DropdownMenuItem onClick={() => void onUpdateSettings(event, { status: "archived", isActive: false })}>
          Lưu trữ
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => void onDelete(event)}>
        Xóa Ladipage
      </DropdownMenuItem>
    </>
  );
}
