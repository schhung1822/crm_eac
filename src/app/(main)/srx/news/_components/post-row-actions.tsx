"use client";

import Link from "next/link";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { SrxNewsPost } from "@/lib/srx-news.shared";

export function PostRowActions({
  onDelete,
  post,
}: {
  onDelete: (post: SrxNewsPost) => Promise<void>;
  post: SrxNewsPost;
}) {
  return (
    <>
      <DropdownMenuLabel>Bài viết tin tức</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={`/srx/news/${post.id}`}>Xem bài viết</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/srx/news/${post.id}/edit`}>Sửa bài viết</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => void onDelete(post)}>
        Xóa bài viết
      </DropdownMenuItem>
    </>
  );
}
