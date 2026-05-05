import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { srxUserStatusValues } from "@/lib/srx-users";

import { CustomerRowActions } from "./row-actions";
import { Users } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

const formatNumber = (value?: number | string) => {
  const num = Number(value ?? 0) || 0;
  return num.toLocaleString("vi-VN");
};

const statusLabelMap: Record<(typeof srxUserStatusValues)[number], string> = {
  pending_verification: "Chờ xác minh",
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
  banned: "Đã khóa",
};

const statusVariantMap: Record<
  (typeof srxUserStatusValues)[number],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending_verification: "outline",
  active: "default",
  inactive: "secondary",
  banned: "destructive",
};

export function createDashboardColumns({
  pendingCustomerId,
  onStatusChange,
}: {
  pendingCustomerId: string | null;
  onStatusChange: (customerId: string, status: Users["status"]) => Promise<void>;
}): ColumnDef<Users>[] {
  return [
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
    {
      accessorKey: "full_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Họ tên" />,
      cell: ({ row }) => (
        <div className="max-w-[320px] truncate">
          <TableCellViewer item={row.original} />
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="block max-w-[320px] truncate">{row.original.email}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
      cell: ({ row }) => <span className="block max-w-[220px] truncate font-mono">{row.original.phone || "—"}</span>,
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
      accessorKey: "gender",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
      cell: ({ row }) => <span className="block max-w-[180px] truncate">{row.original.gender || "—"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "order_count",
      header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Đơn hàng" />,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatNumber(row.original.order_count)}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "total_spent",
      header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Chi tiêu" />,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatNumber(row.original.total_spent)}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "default_address",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Địa chỉ mặc định" />,
      cell: ({ row }) => <span className="block max-w-[360px] truncate">{row.original.default_address || "—"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày tạo" />,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-sm">
          {row.original.created_at.toLocaleDateString("vi-VN")}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "last_login_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Đăng nhập cuối" />,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-sm">
          {row.original.last_login_at?.toLocaleDateString("vi-VN") ?? "—"}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">Mở menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <CustomerRowActions
              customer={row.original}
              isPending={pendingCustomerId === row.original.id}
              onStatusChange={onStatusChange}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];
}
