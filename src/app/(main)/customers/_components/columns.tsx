"use client";

import * as React from "react";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, EllipsisVertical, ReceiptText } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Users } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

const formatNumber = (value?: number | string) => {
  const number = Number(value ?? 0) || 0;
  return number.toLocaleString("vi-VN");
};

const formatDate = (value?: Date | null) => {
  if (!value) return "—";
  return value.toLocaleDateString("vi-VN");
};

function CustomerRowActions({ customer }: { customer: Users }) {
  const [quickViewOpen, setQuickViewOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground size-8"
            size="icon"
            aria-label={`Mở thao tác cho ${customer.name}`}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setQuickViewOpen(true)}>
            <Eye className="size-4" />
            Xem thông tin nhanh
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/orders/${encodeURIComponent(customer.customer_ID)}`}>
              <ReceiptText className="size-4" />
              Xem chi tiết đơn hàng
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TableCellViewer item={customer} open={quickViewOpen} onOpenChange={setQuickViewOpen} hideTrigger />
    </>
  );
}

export const dashboardColumns: ColumnDef<Users>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Chọn tất cả khách hàng"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Chọn ${row.original.name}`}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Khách hàng" />,
    cell: ({ row }) => (
      <div className="max-w-52 min-w-0">
        <TableCellViewer item={row.original} />
        <div className="text-muted-foreground truncate text-xs">{row.original.customer_ID}</div>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Liên hệ" />,
    cell: ({ row }) => (
      <div className="max-w-56 space-y-1">
        <div className="font-medium tabular-nums">{row.original.phone || "—"}</div>
        <div className="text-muted-foreground truncate text-xs" title={row.original.address}>
          {row.original.address || row.original.company || "Chưa có địa chỉ"}
        </div>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "class",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phân loại" />,
    cell: ({ row }) => (
      <div className="space-y-1.5">
        <Badge variant="outline">{row.original.class || "Chưa phân loại"}</Badge>
        <div className="text-muted-foreground text-xs">
          {[row.original.gender, formatDate(row.original.birth)]
            .filter((value) => value && value !== "—")
            .join(" · ") || "—"}
        </div>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "branch",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phụ trách" />,
    cell: ({ row }) => (
      <div className="max-w-44 space-y-1">
        <div className="truncate font-medium" title={row.original.branch}>
          {row.original.branch || "Chưa có chi nhánh"}
        </div>
        <div className="text-muted-foreground truncate text-xs" title={row.original.create_by}>
          {row.original.create_by || "Chưa rõ người tạo"}
        </div>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "tong_ban",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Tài chính" />,
    cell: ({ row }) => (
      <div className="space-y-1 text-right tabular-nums">
        <div className="font-semibold">{formatNumber(row.original.tong_ban)} đ</div>
        <div className="text-muted-foreground text-xs">Nợ: {formatNumber(row.original.no_hien_tai)} đ</div>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "last_payment",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hoạt động" />,
    cell: ({ row }) => (
      <div className="space-y-1 text-sm">
        <div>{formatDate(row.original.last_payment)}</div>
        <div className="text-muted-foreground text-xs">Tạo: {formatDate(row.original.create_time)}</div>
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Thao tác</span>,
    cell: ({ row }) => <CustomerRowActions customer={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
