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
import {
  parseSrxProductCategory,
  type SrxProductCategory,
  type SrxProductCategoryMutationInput,
} from "@/lib/srx-products.shared";

import { CategoryFormDialog } from "./category-form-dialog";

function sortCategories(categories: SrxProductCategory[]): SrxProductCategory[] {
  return [...categories].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.name.localeCompare(right.name, "vi");
  });
}

export function CategoriesManager({ initialCategories }: { initialCategories: SrxProductCategory[] }) {
  const [categories, setCategories] = React.useState<SrxProductCategory[]>(sortCategories(initialCategories));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<SrxProductCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredCategories = React.useMemo(() => {
    return filterBySearchTerm(categories, searchTerm, (category) => [
      category.name,
      category.slug,
      category.description,
      category.parent_name,
    ]);
  }, [categories, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxProductCategoryMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(
          editingCategory ? `/api/srx/product-categories/${editingCategory.id}` : "/api/srx/product-categories",
          {
            method: editingCategory ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu danh mục sản phẩm");
        }

        const category = parseSrxProductCategory(result.category);

        setCategories((current) =>
          sortCategories(
            editingCategory
              ? current.map((item) => (item.id === editingCategory.id ? category : item))
              : [...current, category],
          ),
        );

        toast.success(editingCategory ? "Đã cập nhật danh mục sản phẩm" : "Đã tạo danh mục sản phẩm mới");
        setFormOpen(false);
        setEditingCategory(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu danh mục sản phẩm");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingCategory],
  );

  const deleteCategoryRequest = React.useCallback(async (categoryId: string) => {
    const response = await fetch(`/api/srx/product-categories/${categoryId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa danh mục sản phẩm");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (category: SrxProductCategory) => {
      if (!window.confirm(`Xóa danh mục "${category.name}"?`)) {
        return;
      }

      try {
        await deleteCategoryRequest(category.id);
        setCategories((current) => current.filter((item) => item.id !== category.id));
        toast.success("Đã xóa danh mục sản phẩm");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa danh mục sản phẩm");
      }
    },
    [deleteCategoryRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxProductCategory>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả danh mục sản phẩm"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn danh mục ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.slug}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "parent_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục cha" />,
        cell: ({ row }) => <span>{row.original.parent_name || "—"}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Mô tả" />,
        cell: ({ row }) => <div className="max-w-[320px] truncate text-sm">{row.original.description || "—"}</div>,
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Hoạt động" : "Ẩn"}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thứ tự" />,
        cell: ({ row }) => <span>{row.original.sort_order}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "product_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
        cell: ({ row }) => <span>{row.original.product_count}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => <span>{row.original.updated_at.toLocaleDateString("vi-VN")}</span>,
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
                setEditingCategory(row.original);
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
    data: filteredCategories,
    columns,
    getRowId: (row) => row.id,
  });

  const rowSelection = table.getState().rowSelection;
  const selectedCategories = React.useMemo(
    () => filteredCategories.filter((category) => rowSelection[category.id]),
    [filteredCategories, rowSelection],
  );
  const selectedCategoryCount = selectedCategories.length;

  async function handleBulkDelete() {
    if (selectedCategories.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedCategories.length} danh mục đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedCategories.map(async (category) => {
          await deleteCategoryRequest(category.id);
          return category.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setCategories((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} danh mục sản phẩm`);
        return;
      }

      toast.error(
        `Đã xóa ${deletedIds.length}/${selectedCategories.length} danh mục. ${failedCount} mục không thể xóa.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các danh mục sản phẩm đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Danh mục sản phẩm</h1>
        <p className="text-muted-foreground">Quản lý nhóm danh mục để sản phẩm hiển thị đúng cấu trúc trên shop.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, slug, mô tả hoặc danh mục cha..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedCategoryCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedCategoryCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingCategory(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable table={table} columns={columns} />
      </div>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingCategory}
        categories={categories}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
