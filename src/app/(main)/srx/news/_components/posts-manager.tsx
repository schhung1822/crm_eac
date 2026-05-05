"use client";

import * as React from "react";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import type { SrxNewsPost } from "@/lib/srx-news.shared";

import { PostRowActions } from "./post-row-actions";

const statusLabelMap: Record<SrxNewsPost["status"], string> = {
  draft: "Nháp",
  published: "Đang hiển thị",
  archived: "Lưu trữ",
};

const statusVariantMap: Record<SrxNewsPost["status"], "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

function formatDate(value: Date | null): string {
  return value ? value.toLocaleDateString("vi-VN") : "—";
}

function formatCount(value: number): string {
  return value.toLocaleString("vi-VN");
}

export function PostsManager({ initialPosts, canCreatePost }: { initialPosts: SrxNewsPost[]; canCreatePost: boolean }) {
  const [posts, setPosts] = React.useState<SrxNewsPost[]>(initialPosts);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredPosts = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return posts;
    }

    const term = searchTerm.toLowerCase();
    return posts.filter((post) => {
      const tagNames = post.tags.map((tag) => tag.name.toLowerCase()).join(" ");

      return (
        post.title.toLowerCase().includes(term) ||
        post.slug.toLowerCase().includes(term) ||
        post.category_name.toLowerCase().includes(term) ||
        post.status.toLowerCase().includes(term) ||
        tagNames.includes(term)
      );
    });
  }, [posts, searchTerm]);

  const deletePostRequest = React.useCallback(async (postId: string) => {
    const response = await fetch(`/api/srx/news/posts/${postId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa bài viết");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (post: SrxNewsPost) => {
      if (!window.confirm(`Xóa bài viết "${post.title}"?`)) {
        return;
      }

      try {
        await deletePostRequest(post.id);
        setPosts((current) => current.filter((item) => item.id !== post.id));
        toast.success("Đã xóa bài viết");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa bài viết");
      }
    },
    [deletePostRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxNewsPost>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả bài viết"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn bài viết ${row.original.title}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bài viết" />,
        cell: ({ row }) => (
          <div className="max-w-[460px] min-w-[360px] space-y-1 whitespace-normal">
            <Link
              href={`/srx/news/${row.original.id}/edit`}
              className="hover:text-primary inline-block leading-6 font-medium break-words transition-colors"
            >
              {row.original.title}
            </Link> <br></br>
            <Link
              href={`/srx/news/${row.original.id}/edit`}
              className="text-muted-foreground hover:text-primary inline-block text-xs break-all transition-colors"
            >
              {row.original.slug}
            </Link>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "category_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
        cell: ({ row }) => (
          <div className="min-w-[100px] leading-5 whitespace-normal">{row.original.category_name}</div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "tags",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thẻ" />,
        cell: ({ row }) => (
          <div className="max-w-[320px] min-w-[220px] text-sm leading-6 whitespace-normal">
            {row.original.tags.map((tag) => tag.name).join(", ") || "—"}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <Badge variant={statusVariantMap[row.original.status]}>{statusLabelMap[row.original.status]}</Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "view_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Lượt xem" />,
        cell: ({ row }) => <span className="font-medium">{formatCount(row.original.view_count)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "is_featured",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nổi bật" />,
        cell: ({ row }) => <span>{row.original.is_featured ? "Có" : "Không"}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "published_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Xuất bản" />,
        cell: ({ row }) => <span>{formatDate(row.original.published_at)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tạo lúc" />,
        cell: ({ row }) => <span>{row.original.created_at.toLocaleDateString("vi-VN")}</span>,
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-muted-foreground data-[state=open]:bg-muted flex size-8"
                  size="icon"
                >
                  <EllipsisVertical className="size-4" />
                  <span className="sr-only">Mở menu bài viết</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <PostRowActions post={row.original} onDelete={handleDelete} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete],
  );

  const table = useDataTableInstance({
    data: filteredPosts,
    columns,
    getRowId: (row) => row.id,
  });

  const selectedPosts = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const selectedPostCount = selectedPosts.length;

  async function handleBulkDelete() {
    if (selectedPosts.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedPosts.length} bài viết đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedPosts.map(async (post) => {
          await deletePostRequest(post.id);
          return post.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setPosts((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} bài viết`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedPosts.length} bài viết. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các bài viết đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý tin tức</h1>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tiêu đề, slug, danh mục, thẻ..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedPostCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedPostCount})`}
            </Button>
          ) : null}

          {canCreatePost ? (
            <Button asChild>
              <Link href="/srx/news/new">
                <Plus className="size-4" />
                Thêm bài viết
              </Link>
            </Button>
          ) : (
            <Button disabled>
              <Plus className="size-4" />
              Thêm bài viết
            </Button>
          )}
        </div>
      </div>

      {!canCreatePost ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
          Cần tạo ít nhất một danh mục tin tức trước khi thêm bài viết.
        </div>
      ) : null}

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable
          table={table}
          columns={columns}
          tableClassName="min-w-[1560px]"
          headClassName="h-12 px-3 text-sm"
          rowClassName="[&>td]:border-border/70"
          cellClassName="px-3 py-4 align-top"
        />
      </div>
    </div>
  );
}
