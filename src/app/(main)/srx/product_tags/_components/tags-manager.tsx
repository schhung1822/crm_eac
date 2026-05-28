"use client";

import * as React from "react";

import Link from "next/link";

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
import { type SrxProductTag } from "@/lib/srx-products.shared";

function sortTags(tags: SrxProductTag[]): SrxProductTag[] {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name, "vi"));
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function TagsManager({ initialTags }: { initialTags: SrxProductTag[] }) {
  const [tags, setTags] = React.useState<SrxProductTag[]>(sortTags(initialTags));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredTags = React.useMemo(() => {
    return filterBySearchTerm(tags, searchTerm, (tag) => [
      tag.name,
      tag.slug,
      tag.description,
      stripHtml(tag.desc_long),
      tag.image_url,
      tag.class,
      tag.tag_groups,
      tag.stars?.toString() ?? "",
    ]);
  }, [tags, searchTerm]);

  const deleteTagRequest = React.useCallback(async (tagId: string) => {
    const response = await fetch(`/api/srx/product-tags/${tagId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Khong the xoa thanh phan");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (tag: SrxProductTag) => {
      if (!window.confirm(`Xoa thanh phan "${tag.name}"?`)) {
        return;
      }

      try {
        await deleteTagRequest(tag.id);
        setTags((current) => current.filter((item) => item.id !== tag.id));
        toast.success("Da xoa thanh phan");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Khong the xoa thanh phan");
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
              aria-label="Chon tat ca thanh phan"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chon thanh phan ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thanh phan" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <Link className="font-medium" href={`/srx/product_tags/${row.original.id}/edit`}>
              {row.original.name}
            </Link>
            <div className="text-muted-foreground text-xs">{row.original.slug}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "class",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phan loai" />,
        cell: ({ row }) =>
          row.original.class.length > 0 ? (
            <div className="flex max-w-[320px] flex-wrap gap-1">
              {row.original.class.map((value) => (
                <Badge key={value} variant="outline" className="text-left leading-4 whitespace-normal">
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Chua co</span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: "stars",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Danh gia" />,
        cell: ({ row }) => <span>{row.original.stars ?? "-"}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "tag_groups",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Loi ich" />,
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
            <span className="text-muted-foreground text-sm">Chua co</span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: "image_url",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Anh" />,
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
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "product_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="So san pham chua thanh phan" />,
        cell: ({ row }) => <span>{row.original.product_count}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ngay tao" />,
        cell: ({ row }) => <span>{row.original.created_at.toLocaleDateString("vi-VN")}</span>,
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/srx/product_tags/${row.original.id}/edit`}>Sua</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleDelete(row.original)}>
              Xoa
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

    if (!window.confirm(`Xoa ${selectedTags.length} thanh phan da chon?`)) {
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
        toast.success(`Da xoa ${deletedIds.length} thanh phan`);
        return;
      }

      toast.error(`Da xoa ${deletedIds.length}/${selectedTags.length} muc. ${failedCount} muc khong the xoa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa thanh phan da chon");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tu dien thanh phan</h1>
        <p className="text-muted-foreground">Quan ly thong tin cac thanh phan hien thi tren website.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tim theo ten, slug, phan loai, loi ich..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedTagCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Dang xoa..." : `Xoa da chon (${selectedTagCount})`}
            </Button>
          ) : null}

          <Button asChild>
            <Link href="/srx/product_tags/new">
              <Plus className="size-4" />
              Them thanh phan
            </Link>
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>
    </div>
  );
}
