"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { filterBySearchTerm } from "@/lib/search-utils";
import { parseSrxProductTag, type SrxProductTag, type SrxProductTagMutationInput } from "@/lib/srx-products.shared";

import { TagFormDialog } from "./tag-form-dialog";

function sortTags(tags: SrxProductTag[]): SrxProductTag[] {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name, "vi"));
}

export function TagsManager({ initialTags }: { initialTags: SrxProductTag[] }) {
  const [tags, setTags] = React.useState<SrxProductTag[]>(sortTags(initialTags));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<SrxProductTag | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredTags = React.useMemo(() => {
    return filterBySearchTerm(tags, searchTerm, (tag) => [
      tag.name,
      tag.slug,
      tag.description,
      tag.image_url,
      tag.tag_groups,
    ]);
  }, [tags, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxProductTagMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(editingTag ? `/api/srx/product-tags/${editingTag.id}` : "/api/srx/product-tags", {
          method: editingTag ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu thành phần");
        }

        const tag = parseSrxProductTag(result.tag);

        setTags((current) =>
          sortTags(editingTag ? current.map((item) => (item.id === editingTag.id ? tag : item)) : [...current, tag]),
        );

        toast.success(editingTag ? "Đã cập nhật thành phần" : "Đã tạo thành phần mới");
        setFormOpen(false);
        setEditingTag(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu thành phần");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingTag],
  );

  const deleteTagRequest = React.useCallback(async (tagId: string) => {
    const response = await fetch(`/api/srx/product-tags/${tagId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa thành phần");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (tag: SrxProductTag) => {
      if (!window.confirm(`Xóa thành phần "${tag.name}"?`)) {
        return;
      }

      try {
        await deleteTagRequest(tag.id);
        setTags((current) => current.filter((item) => item.id !== tag.id));
        toast.success("Đã xóa thành phần");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa thành phần");
      }
    },
    [deleteTagRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxProductTag>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả thành phần"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn thành phần ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thành phần" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.slug}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "tag_groups",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phân nhóm" />,
        cell: ({ row }) =>
          row.original.tag_groups.length > 0 ? (
            <div className="flex max-w-[320px] flex-wrap gap-1">
              {row.original.tag_groups.map((group) => (
                <Badge key={group} variant="secondary" className="text-left leading-4 whitespace-normal">
                  {group}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Chưa phân nhóm</span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Mô tả" />,
        cell: ({ row }) => (
          <div className="max-w-[320px]">
            <div className="line-clamp-2 text-sm leading-5">{row.original.description || "Chưa có mô tả"}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "image_url",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ảnh" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border">
              {row.original.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.original.image_url} alt={row.original.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-[10px]">No img</span>
              )}
            </div>
            <div className="max-w-[220px]">
              <div className="truncate text-sm">{row.original.image_url || "Chưa có ảnh"}</div>
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "product_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm dùng thành phần" />,
        cell: ({ row }) => <span>{row.original.product_count}</span>,
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

    if (!window.confirm(`Xóa ${selectedTags.length} thành phần đã chọn?`)) {
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
        toast.success(`Đã xóa ${deletedIds.length} thành phần`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedTags.length} mục. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các thành phần đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Từ điển thành phần</h1>
        <p className="text-muted-foreground">
          Quản lý danh mục thành phần để gắn nhanh cho sản phẩm theo hoạt chất, công dụng hoặc nhóm chăm sóc da.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên thành phần, slug, mô tả, ảnh hoặc phân nhóm..."
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
            Thêm thành phần
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
