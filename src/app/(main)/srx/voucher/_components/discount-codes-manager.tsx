/* eslint-disable max-lines */
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
  parseSrxDiscountCode,
  type SrxDiscountCode,
  type SrxDiscountCodeMutationInput,
} from "@/lib/srx-website.shared";

import { DiscountCodeFormDialog } from "./discount-code-form-dialog";

type ReferenceOption = {
  id: string;
  label: string;
};

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getDiscountValueLabel(discountCode: SrxDiscountCode): string {
  switch (discountCode.discount_type) {
    case "percentage":
      return `${discountCode.discount_value}%`;
    case "fixed_amount":
      return formatCurrency(discountCode.discount_value);
    case "free_shipping":
      return "Miễn phí vận chuyển";
    default:
      return String(discountCode.discount_value);
  }
}

function getScopeLabel(scopeType: SrxDiscountCode["scope_type"]): string {
  switch (scopeType) {
    case "all_orders":
      return "Toàn bộ đơn";
    case "specific_products":
      return "Sản phẩm";
    case "specific_categories":
      return "Danh mục";
    default:
      return scopeType;
  }
}

function sortDiscountCodes(discountCodes: SrxDiscountCode[]): SrxDiscountCode[] {
  return [...discountCodes].sort((left, right) => right.created_at.getTime() - left.created_at.getTime());
}

export function DiscountCodesManager({
  initialDiscountCodes,
  productOptions,
  categoryOptions,
}: {
  initialDiscountCodes: SrxDiscountCode[];
  productOptions: ReferenceOption[];
  categoryOptions: ReferenceOption[];
}) {
  const [discountCodes, setDiscountCodes] = React.useState<SrxDiscountCode[]>(sortDiscountCodes(initialDiscountCodes));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingDiscountCode, setEditingDiscountCode] = React.useState<SrxDiscountCode | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredDiscountCodes = React.useMemo(() => {
    return filterBySearchTerm(discountCodes, searchTerm, (discountCode) => [
      discountCode.code,
      discountCode.name,
      discountCode.description,
      discountCode.status,
      discountCode.product_names,
      discountCode.category_names,
    ]);
  }, [discountCodes, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxDiscountCodeMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(
          editingDiscountCode ? `/api/srx/discount-codes/${editingDiscountCode.id}` : "/api/srx/discount-codes",
          {
            method: editingDiscountCode ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu mã giảm giá");
        }

        const discountCode = parseSrxDiscountCode(result.discountCode);

        setDiscountCodes((current) =>
          sortDiscountCodes(
            editingDiscountCode
              ? current.map((item) => (item.id === editingDiscountCode.id ? discountCode : item))
              : [...current, discountCode],
          ),
        );

        toast.success(editingDiscountCode ? "Đã cập nhật mã giảm giá" : "Đã tạo mã giảm giá mới");
        setFormOpen(false);
        setEditingDiscountCode(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu mã giảm giá");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingDiscountCode],
  );

  const deleteDiscountCodeRequest = React.useCallback(async (discountCodeId: string) => {
    const response = await fetch(`/api/srx/discount-codes/${discountCodeId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa mã giảm giá");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (discountCode: SrxDiscountCode) => {
      if (!window.confirm(`Xóa mã giảm giá "${discountCode.code}"?`)) {
        return;
      }

      try {
        await deleteDiscountCodeRequest(discountCode.id);
        setDiscountCodes((current) => current.filter((item) => item.id !== discountCode.id));
        toast.success("Đã xóa mã giảm giá");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa mã giảm giá");
      }
    },
    [deleteDiscountCodeRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxDiscountCode>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả mã giảm giá"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn mã giảm giá ${row.original.code}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Mã giảm giá" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.code}</div>
            <div className="text-muted-foreground text-xs">{row.original.name}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "discount_value",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Giá trị" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{getDiscountValueLabel(row.original)}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.max_discount_amount === null
                ? "Không giới hạn trần"
                : `Trần ${formatCurrency(row.original.max_discount_amount)}`}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "scope_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phạm vi" />,
        cell: ({ row }) => (
          <div>
            <div>{getScopeLabel(row.original.scope_type)}</div>
            <div className="text-muted-foreground line-clamp-2 text-xs">
              {row.original.scope_type === "specific_products"
                ? row.original.product_names.join(", ") || "—"
                : row.original.scope_type === "specific_categories"
                  ? row.original.category_names.join(", ") || "—"
                  : "Áp dụng toàn bộ đơn hàng"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "usage_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sử dụng" />,
        cell: ({ row }) => (
          <div>
            <div>{row.original.usage_count} lượt</div>
            <div className="text-muted-foreground text-xs">
              {row.original.total_usage_limit === null
                ? "Không giới hạn"
                : `${row.original.total_usage_limit} lượt tối đa`}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Đang bật" : "Đang tắt"}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "ends_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hiệu lực" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.starts_at ? row.original.starts_at.toLocaleDateString("vi-VN") : "Bắt đầu ngay"}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.ends_at ? `Đến ${row.original.ends_at.toLocaleDateString("vi-VN")}` : "Không giới hạn"}
            </div>
          </div>
        ),
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
                setEditingDiscountCode(row.original);
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
    data: filteredDiscountCodes,
    columns,
    getRowId: (row) => row.id,
  });

  const rowSelection = table.getState().rowSelection;
  const selectedDiscountCodes = React.useMemo(
    () => filteredDiscountCodes.filter((discountCode) => rowSelection[discountCode.id]),
    [filteredDiscountCodes, rowSelection],
  );
  const selectedDiscountCodeCount = selectedDiscountCodes.length;

  async function handleBulkDelete() {
    if (selectedDiscountCodes.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedDiscountCodes.length} mã giảm giá đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedDiscountCodes.map(async (discountCode) => {
          await deleteDiscountCodeRequest(discountCode.id);
          return discountCode.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setDiscountCodes((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} mã giảm giá`);
        return;
      }

      toast.error(
        `Đã xóa ${deletedIds.length}/${selectedDiscountCodes.length} mã giảm giá. ${failedCount} mục không thể xóa.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các mã giảm giá đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mã giảm giá</h1>
        <p className="text-muted-foreground">Quản lý voucher, phạm vi áp dụng và giới hạn sử dụng cho website SRX.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo mã, tên, mô tả..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedDiscountCodeCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedDiscountCodeCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingDiscountCode(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm mã giảm giá
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable table={table} columns={columns} />
      </div>

      <DiscountCodeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingDiscountCode}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        productOptions={productOptions}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
