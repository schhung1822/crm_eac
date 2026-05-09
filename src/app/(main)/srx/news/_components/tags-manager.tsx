"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { filterBySearchTerm } from "@/lib/search-utils";
import { parseSrxNewsTag, type SrxNewsTag, type SrxNewsTagMutationInput } from "@/lib/srx-news.shared";

import { TagFormDialog } from "./tag-form-dialog";

export function TagsManager({ initialTags }: { initialTags: SrxNewsTag[] }) {
  const [tags, setTags] = React.useState<SrxNewsTag[]>(initialTags);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<SrxNewsTag | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredTags = React.useMemo(() => {
    return filterBySearchTerm(tags, searchTerm, (tag) => [tag.name, tag.slug]);
  }, [tags, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxNewsTagMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(editingTag ? `/api/srx/news/tags/${editingTag.id}` : "/api/srx/news/tags", {
          method: editingTag ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu thẻ tin tức");
        }

        const tag = parseSrxNewsTag(result.tag);

        setTags((current) =>
          editingTag
            ? current.map((item) => (item.id === editingTag.id ? tag : item))
            : [...current, tag].sort((left, right) => left.name.localeCompare(right.name, "vi")),
        );

        toast.success(editingTag ? "Đã cập nhật thẻ tin tức" : "Đã tạo thẻ tin tức mới");
        setFormOpen(false);
        setEditingTag(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu thẻ tin tức");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingTag],
  );

  const deleteTagRequest = React.useCallback(async (tagId: string) => {
    const response = await fetch(`/api/srx/news/tags/${tagId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa thẻ tin tức");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (tag: SrxNewsTag) => {
      if (!window.confirm(`Xóa thẻ "${tag.name}"?`)) {
        return;
      }

      try {
        await deleteTagRequest(tag.id);
        setTags((current) => current.filter((item) => item.id !== tag.id));
        toast.success("Đã xóa thẻ tin tức");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa thẻ tin tức");
      }
    },
    [deleteTagRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxNewsTag>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả thẻ"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn thẻ ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thẻ" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.slug}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "post_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bài viết dùng thẻ" />,
        cell: ({ row }) => <span>{row.original.post_count}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày tạo" />,
        cell: ({ row }) => <span>{row.original.created_at.toLocaleDateString("vi-VN")}</span>,
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTag(row.original);
                setFormOpen(true);
              }}
            >
              Sửa
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleDelete(row.original)}>
              Xóa
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete],
  );

  const table = useDataTableInstance({
    data: filteredTags,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${searchTerm}|${filteredTags.length}`;

  const rowSelection = table.getState().rowSelection;
  const selectedTags = React.useMemo(
    () => filteredTags.filter((tag) => rowSelection[tag.id]),
    [filteredTags, rowSelection],
  );
  const selectedTagCount = selectedTags.length;

  async function handleBulkDelete() {
    if (selectedTags.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedTags.length} thẻ đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedTags.map(async (tag) => {
          await deleteTagRequest(tag.id);
          return tag.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setTags((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} thẻ`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedTags.length} thẻ. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các thẻ đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Thẻ tin tức</h1>
        <p className="text-muted-foreground">Quản lý tập thẻ để gắn nhanh cho bài viết tin tức trên website.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên hoặc slug..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedTagCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedTagCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingTag(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm thẻ
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>

      <TagFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingTag}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
