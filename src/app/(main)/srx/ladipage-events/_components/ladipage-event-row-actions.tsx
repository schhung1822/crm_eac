"use client";

import Link from "next/link";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { SrxLadipageEvent } from "@/lib/srx-ladipage-events";

export function LadipageEventRowActions({
  event,
  onCopyPublicUrl,
  onDelete,
  publicUrl,
}: {
  event: SrxLadipageEvent;
  onCopyPublicUrl: (event: SrxLadipageEvent) => Promise<void>;
  onDelete: (event: SrxLadipageEvent) => Promise<void>;
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
      <DropdownMenuItem variant="destructive" onClick={() => void onDelete(event)}>
        Xóa Ladipage
      </DropdownMenuItem>
    </>
  );
}
