import { ColumnDef } from "@tanstack/react-table";
import z from "zod";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { ChannelSummarySchema } from "./schema";

const fmtNumber = (n: number) => n.toLocaleString("vi-VN");

export const channelColumns: ColumnDef<z.infer<typeof ChannelSummarySchema>>[] = [
  {
    accessorKey: "kenh_ban",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Kênh bán" />,
    cell: ({ row }) => <span className="font-medium">{row.original.kenh_ban}</span>,
    enableHiding: false,
  },
  {
    accessorKey: "order_count",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Số đơn" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums">{fmtNumber(row.original.order_count)}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Sản phẩm bán ra" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums">{fmtNumber(row.original.quantity)}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "tien_hang",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Tiền hàng" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{fmtNumber(row.original.tien_hang)} ₫</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "giam_gia",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Giảm giá" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{fmtNumber(row.original.giam_gia)} ₫</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "thanh_tien",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full justify-end text-right" column={column} title="Thành tiền" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{fmtNumber(row.original.thanh_tien)} ₫</span>
      </div>
    ),
    enableHiding: false,
  },
];
