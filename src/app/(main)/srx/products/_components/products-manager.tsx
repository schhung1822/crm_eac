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
import { filterBySearchTerm } from "@/lib/search-utils";
import type { SrxProduct } from "@/lib/srx-products.shared";

import { ProductRowActions } from "./product-row-actions";

const statusLabelMap: Record<SrxProduct["status"], string> = {
  active: "Đang hiển thị",
  archived: "Lưu trữ",
  draft: "Nháp",
  inactive: "Tạm ẩn",
};

const statusVariantMap: Record<SrxProduct["status"], "default" | "secondary" | "outline"> = {
  active: "default",
  archived: "secondary",
  draft: "outline",
  inactive: "secondary",
};

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value)} đ`;
}

function formatDate(value: Date | null): string {
  return value ? value.toLocaleDateString("vi-VN") : "—";
}

function formatCount(value: number): string {
  return value.toLocaleString("vi-VN");
}

export function ProductsManager({ initialProducts }: { initialProducts: SrxProduct[] }) {
  const [products, setProducts] = React.useState<SrxProduct[]>(initialProducts);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredProducts = React.useMemo(() => {
    return filterBySearchTerm(products, searchTerm, (product) => [
      product.name,
      product.slug,
      product.product_code,
      product.category_name,
      product.tags.map((tag) => tag.name),
    ]);
  }, [products, searchTerm]);

  const deleteProductRequest = React.useCallback(async (productId: string) => {
    const response = await fetch(`/api/srx/products/${productId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa sản phẩm");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (product: SrxProduct) => {
      if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
        return;
      }

      try {
        await deleteProductRequest(product.id);
        setProducts((current) => current.filter((item) => item.id !== product.id));
        toast.success("Đã xóa sản phẩm");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa sản phẩm");
      }
    },
    [deleteProductRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxProduct>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả sản phẩm"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn sản phẩm ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
        cell: ({ row }) => (
          <div className="max-w-[460px] min-w-[360px] space-y-1 whitespace-normal">
            <Link
              href={`/srx/products/${row.original.id}/edit`}
              className="hover:text-primary inline-block leading-6 font-medium break-words transition-colors"
            >
              {row.original.name}
            </Link>
            <div className="text-muted-foreground text-xs break-all">{row.original.slug}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "category_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
        cell: ({ row }) => <div className="min-w-[120px] whitespace-normal">{row.original.category_name || "—"}</div>,
        enableSorting: false,
      },
      {
        accessorKey: "tags",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thành phần" />,
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
        accessorKey: "pricing",
        header: () => <span>Giá bán</span>,
        cell: ({ row }) => (
          <div className="min-w-[140px] space-y-1 text-sm">
            <div className="font-medium">{formatCurrency(row.original.base_price)}</div>
            <div className="text-muted-foreground">KM: {formatCurrency(row.original.sale_price)}</div>
          </div>
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
        accessorKey: "sold_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Đã bán" />,
        cell: ({ row }) => <span>{formatCount(row.original.sold_count)}</span>,
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
                  <span className="sr-only">Mở menu sản phẩm</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <ProductRowActions product={row.original} onDelete={handleDelete} />
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
    data: filteredProducts,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${searchTerm}|${filteredProducts.length}`;

  const rowSelection = table.getState().rowSelection;
  const selectedProducts = React.useMemo(
    () => filteredProducts.filter((product) => rowSelection[product.id]),
    [filteredProducts, rowSelection],
  );
  const selectedProductCount = selectedProducts.length;

  async function handleBulkDelete() {
    if (selectedProducts.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedProducts.length} sản phẩm đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedProducts.map(async (product) => {
          await deleteProductRequest(product.id);
          return product.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setProducts((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} sản phẩm`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedProducts.length} sản phẩm. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các sản phẩm đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý sản phẩm</h1>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, mã, slug, danh mục, thành phần..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedProductCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedProductCount})`}
            </Button>
          ) : null}

          <Button asChild>
            <Link href="/srx/products/new">
              <Plus className="size-4" />
              Thêm sản phẩm
            </Link>
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable
          key={tableRenderKey}
          table={table}
          columns={columns}
          tableClassName="min-w-[1680px]"
          headClassName="h-12 px-3 text-sm"
          rowClassName="[&>td]:border-border/70"
          cellClassName="px-3 py-4 align-top"
        />
      </div>
    </div>
  );
}
