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
  parseSrxPaymentMethod,
  type SrxPaymentMethod,
  type SrxPaymentMethodMutationInput,
} from "@/lib/srx-website.shared";

import { PaymentMethodFormDialog } from "./payment-method-form-dialog";

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

function getMethodTypeLabel(methodType: SrxPaymentMethod["method_type"]): string {
  switch (methodType) {
    case "cod":
      return "COD";
    case "bank_transfer":
      return "Chuyển khoản";
    case "card":
      return "Thẻ";
    case "e_wallet":
      return "Ví điện tử";
    case "other":
      return "Khác";
    default:
      return methodType;
  }
}

function getFeeLabel(paymentMethod: SrxPaymentMethod): string {
  switch (paymentMethod.fee_type) {
    case "none":
      return "Không tính phí";
    case "fixed":
      return formatCurrency(paymentMethod.fee_value);
    case "percentage":
      return `${paymentMethod.fee_value}%`;
    default:
      return String(paymentMethod.fee_value);
  }
}

function sortPaymentMethods(paymentMethods: SrxPaymentMethod[]): SrxPaymentMethod[] {
  return [...paymentMethods].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return right.created_at.getTime() - left.created_at.getTime();
  });
}

export function PaymentMethodsManager({ initialPaymentMethods }: { initialPaymentMethods: SrxPaymentMethod[] }) {
  const [paymentMethods, setPaymentMethods] = React.useState<SrxPaymentMethod[]>(
    sortPaymentMethods(initialPaymentMethods),
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = React.useState<SrxPaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredPaymentMethods = React.useMemo(() => {
    return filterBySearchTerm(paymentMethods, searchTerm, (paymentMethod) => [
      paymentMethod.code,
      paymentMethod.name,
      paymentMethod.description,
      paymentMethod.provider,
    ]);
  }, [paymentMethods, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxPaymentMethodMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(
          editingPaymentMethod ? `/api/srx/payment-methods/${editingPaymentMethod.id}` : "/api/srx/payment-methods",
          {
            method: editingPaymentMethod ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu phương thức thanh toán");
        }

        const paymentMethod = parseSrxPaymentMethod(result.paymentMethod);

        setPaymentMethods((current) =>
          sortPaymentMethods(
            editingPaymentMethod
              ? current.map((item) => (item.id === editingPaymentMethod.id ? paymentMethod : item))
              : [...current, paymentMethod],
          ),
        );

        toast.success(
          editingPaymentMethod ? "Đã cập nhật phương thức thanh toán" : "Đã tạo phương thức thanh toán mới",
        );
        setFormOpen(false);
        setEditingPaymentMethod(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu phương thức thanh toán");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingPaymentMethod],
  );

  const deletePaymentMethodRequest = React.useCallback(async (paymentMethodId: string) => {
    const response = await fetch(`/api/srx/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa phương thức thanh toán");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (paymentMethod: SrxPaymentMethod) => {
      if (!window.confirm(`Xóa phương thức "${paymentMethod.name}"?`)) {
        return;
      }

      try {
        await deletePaymentMethodRequest(paymentMethod.id);
        setPaymentMethods((current) => current.filter((item) => item.id !== paymentMethod.id));
        toast.success("Đã xóa phương thức thanh toán");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa phương thức thanh toán");
      }
    },
    [deletePaymentMethodRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxPaymentMethod>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả phương thức thanh toán"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn phương thức ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phương thức" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.code}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "method_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Loại / Provider" />,
        cell: ({ row }) => (
          <div>
            <div>{getMethodTypeLabel(row.original.method_type)}</div>
            <div className="text-muted-foreground text-xs">{row.original.provider || "Không có provider"}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "fee_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phí" />,
        cell: ({ row }) => (
          <div>
            <div>{getFeeLabel(row.original)}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.min_order_amount === null
                ? "Không giới hạn đơn tối thiểu"
                : `Từ ${formatCurrency(row.original.min_order_amount)}`}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "max_order_amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Giới hạn" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>
              {row.original.min_order_amount === null
                ? "Min: —"
                : `Min: ${formatCurrency(row.original.min_order_amount)}`}
            </div>
            <div className="text-muted-foreground text-xs">
              {row.original.max_order_amount === null
                ? "Max: không giới hạn"
                : `Max: ${formatCurrency(row.original.max_order_amount)}`}
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
                setEditingPaymentMethod(row.original);
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
    data: filteredPaymentMethods,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${searchTerm}|${filteredPaymentMethods.length}`;

  const rowSelection = table.getState().rowSelection;
  const selectedPaymentMethods = React.useMemo(
    () => filteredPaymentMethods.filter((paymentMethod) => rowSelection[paymentMethod.id]),
    [filteredPaymentMethods, rowSelection],
  );
  const selectedPaymentMethodCount = selectedPaymentMethods.length;

  async function handleBulkDelete() {
    if (selectedPaymentMethods.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedPaymentMethods.length} phương thức thanh toán đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedPaymentMethods.map(async (paymentMethod) => {
          await deletePaymentMethodRequest(paymentMethod.id);
          return paymentMethod.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setPaymentMethods((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} phương thức thanh toán`);
        return;
      }

      toast.error(
        `Đã xóa ${deletedIds.length}/${selectedPaymentMethods.length} phương thức thanh toán. ${failedCount} mục không thể xóa.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các phương thức thanh toán đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Thanh toán</h1>
        <p className="text-muted-foreground">
          Quản lý phương thức thanh toán, phí và điều kiện hiển thị trên website SRX.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo mã, tên, provider..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedPaymentMethodCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedPaymentMethodCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingPaymentMethod(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm phương thức
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>

      <PaymentMethodFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingPaymentMethod}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
