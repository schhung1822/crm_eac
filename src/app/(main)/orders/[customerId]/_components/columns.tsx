"use client";

import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import type { Channel } from "../../_components/schema";

import { TableCellViewer } from "./table-cell-viewer";

export type CustomerOrderStats = {
  totalOrders: number;
  totalTienHang: number;
  totalThanhTien: number;
  totalQuantity: number;
};

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")} đ`;
const matchesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

function getStatusClassName(status: string) {
  const normalizedStatus = status.toLocaleLowerCase("vi");

  if (matchesAny(normalizedStatus, ["hoàn thành", "hoành thành", "thành công"])) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (matchesAny(normalizedStatus, ["không giao được", "đã hủy", "hủy", "trả hàng"])) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
  }
  if (matchesAny(normalizedStatus, ["đang xử lý", "đã xác nhận", "chờ xác nhận"])) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
  }
  if (matchesAny(normalizedStatus, ["phiếu tạm", "nháp"])) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300";
  }

  return "text-muted-foreground";
}

export function createCustomerOrderColumns(stats: CustomerOrderStats): ColumnDef<Channel>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Chọn tất cả đơn hàng"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Chọn đơn ${row.original.order_ID}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "order_ID",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Đơn hàng" />,
      cell: ({ row }) => (
        <div className="max-w-44">
          <TableCellViewer item={row.original} stats={stats} />
          <div className="text-muted-foreground text-xs">{row.original.create_time.toLocaleDateString("vi-VN")}</div>
        </div>
      ),
    },
    {
      accessorKey: "name_pro",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
      cell: ({ row }) => (
        <div className="max-w-64 space-y-1">
          <div className="truncate font-medium" title={row.original.name_pro}>
            {row.original.name_pro || "Chưa có tên sản phẩm"}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {[row.original.pro_ID, row.original.brand_pro].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "seller",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bán hàng" />,
      cell: ({ row }) => (
        <div className="max-w-44 space-y-1">
          <div className="truncate font-medium">{row.original.seller || "Chưa rõ người bán"}</div>
          <div className="text-muted-foreground truncate text-xs">
            {[row.original.kenh_ban, row.original.brand].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Số lượng" />,
      cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.quantity}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "thanh_tien",
      header: ({ column }) => (
        <DataTableColumnHeader className="w-full text-right" column={column} title="Thanh toán" />
      ),
      cell: ({ row }) => (
        <div className="space-y-1 text-right tabular-nums">
          <div className="font-semibold">{formatMoney(row.original.thanh_tien)}</div>
          <div className="text-muted-foreground text-xs">Giảm: {formatMoney(row.original.giam_gia)}</div>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={getStatusClassName(row.original.status)}>
          {row.original.status || "Chưa cập nhật"}
        </Badge>
      ),
      enableSorting: false,
    },
  ];
}
