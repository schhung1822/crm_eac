import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import type { Product } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

export const dashboardColumns: ColumnDef<Product>[] = [
  // Checkbox chọn nhiều dòng
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Mã sản phẩm
  {
    accessorKey: "pro_ID",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã SP" />,
    cell: ({ row }) => <span className="font-mono">{row.original.pro_ID}</span>,
    enableSorting: false,
  },

  // Tên
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <TableCellViewer item={row.original} />
      </div>
    ),
    enableSorting: false,
  },

  // Thương hiệu
  {
    accessorKey: "brand",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thương hiệu" />,
    cell: ({ row }) => <span className="block max-w-[200px] truncate">{row.original.brand}</span>,
    enableSorting: false,
  },

  // Phân loại
  {
    accessorKey: "class",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phân loại" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.class}</span>,
    enableSorting: false,
  },

  // Giá bán
  {
    accessorKey: "gia_ban",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Giá bán" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.gia_ban || 0).toLocaleString("vi-VN")}đ</div>
    ),
    enableSorting: false,
  },

  // Giá vốn
  {
    accessorKey: "gia_von",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Giá vốn" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.gia_von || 0).toLocaleString("vi-VN")}đ</div>
    ),
    enableSorting: false,
  },

  {
    accessorKey: "soldQuantity",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Đã bán" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">{row.original.soldQuantity.toLocaleString("vi-VN")}</div>
    ),
    enableHiding: false,
  },

  {
    accessorKey: "salesRevenue",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Doanh thu" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-semibold tabular-nums">
        {Math.round(row.original.salesRevenue).toLocaleString("vi-VN")}đ
      </div>
    ),
    enableHiding: false,
  },

  // Actions
  {
    id: "actions",
    header: () => <div className="text-right">Thao tác</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <TableCellViewer
          item={row.original}
          trigger={
            <Button variant="outline" size="sm">
              Xem chi tiết
            </Button>
          }
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
