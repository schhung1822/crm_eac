"use client";

import * as React from "react";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { srxOrderPaymentStatusValues, srxOrderStatusValues, type SrxOrder } from "@/lib/srx-orders.shared";

import {
  formatCurrency,
  getOrderStatusLabel,
  getOrderStatusVariant,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
} from "./order-presenters";
import { OrderRowActions } from "./order-row-actions";

function matchesOrderSearch(order: SrxOrder, term: string) {
  return (
    order.order_number.toLowerCase().includes(term) ||
    order.customer_name.toLowerCase().includes(term) ||
    order.customer_phone.toLowerCase().includes(term) ||
    order.customer_email.toLowerCase().includes(term) ||
    order.shipping_recipient_name.toLowerCase().includes(term) ||
    order.shipping_recipient_phone.toLowerCase().includes(term) ||
    order.shipping_address.toLowerCase().includes(term)
  );
}

export function OrdersManager({ initialOrders }: { initialOrders: SrxOrder[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<string>("all");

  const filteredOrders = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return initialOrders.filter((order) => {
        const matchesOrderStatus = orderStatusFilter === "all" || order.order_status === orderStatusFilter;
        const matchesPaymentStatus = paymentStatusFilter === "all" || order.payment_status === paymentStatusFilter;

        return matchesOrderStatus && matchesPaymentStatus;
      });
    }

    const term = searchTerm.toLowerCase();

    return initialOrders.filter((order) => {
      const matchesSearch = matchesOrderSearch(order, term);

      const matchesOrderStatus = orderStatusFilter === "all" || order.order_status === orderStatusFilter;
      const matchesPaymentStatus = paymentStatusFilter === "all" || order.payment_status === paymentStatusFilter;

      return matchesSearch && matchesOrderStatus && matchesPaymentStatus;
    });
  }, [initialOrders, orderStatusFilter, paymentStatusFilter, searchTerm]);

  const summary = React.useMemo(
    () => ({
      total: filteredOrders.length,
      pending: filteredOrders.filter((order) => order.order_status === "pending").length,
      shipping: filteredOrders.filter((order) => order.order_status === "shipping").length,
      revenue: filteredOrders.reduce((sum, order) => sum + order.grand_total, 0),
    }),
    [filteredOrders],
  );

  const columns = React.useMemo<ColumnDef<SrxOrder>[]>(
    () => [
      {
        accessorKey: "order_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Đơn hàng" />,
        cell: ({ row }) => (
          <div className="min-w-[180px] space-y-1">
            <Link
              href={`/srx/orders/${row.original.id}`}
              className="hover:text-primary inline-block font-medium transition-colors"
            >
              {row.original.order_number}
            </Link>
            <div className="text-muted-foreground text-xs">{row.original.placed_at.toLocaleString("vi-VN")}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "customer_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Khách hàng" />,
        cell: ({ row }) => (
          <div className="min-w-[220px] space-y-1">
            <div className="font-medium">{row.original.customer_name}</div>
            <div className="text-muted-foreground text-xs">{row.original.customer_phone}</div>
            <div className="text-muted-foreground text-xs">{row.original.customer_email || "—"}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "shipping_address",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Giao hàng" />,
        cell: ({ row }) => (
          <div className="min-w-[260px] space-y-1 whitespace-normal">
            <div>{row.original.shipping_recipient_name || "—"}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.shipping_recipient_phone || row.original.customer_phone || "—"}
            </div>
            <div className="text-muted-foreground text-xs">{row.original.shipping_address || "—"}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "order_status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái đơn" />,
        cell: ({ row }) => (
          <Badge variant={getOrderStatusVariant(row.original.order_status)}>
            {getOrderStatusLabel(row.original.order_status)}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "payment_status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thanh toán" />,
        cell: ({ row }) => (
          <div className="min-w-[150px] space-y-1">
            <Badge variant={getPaymentStatusVariant(row.original.payment_status)}>
              {getPaymentStatusLabel(row.original.payment_status)}
            </Badge>
            <div className="text-muted-foreground text-xs">{getPaymentMethodLabel(row.original.payment_method)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "item_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
        cell: ({ row }) => (
          <div className="min-w-[110px] space-y-1 text-sm">
            <div>{row.original.item_count} dòng</div>
            <div className="text-muted-foreground">{row.original.total_quantity} SP</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "grand_total",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tổng tiền" />,
        cell: ({ row }) => (
          <div className="min-w-[130px] space-y-1 text-sm">
            <div className="font-medium">{formatCurrency(row.original.grand_total)}</div>
            <div className="text-muted-foreground">Giảm: {formatCurrency(row.original.discount_total)}</div>
          </div>
        ),
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
                  <span className="sr-only">Mở menu đơn hàng</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <OrderRowActions order={row.original} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: filteredOrders,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row.id,
  });

  const tableRenderKey = `${searchTerm}|${orderStatusFilter}|${paymentStatusFilter}|${filteredOrders.length}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý đơn hàng</h1>
        <p className="text-muted-foreground">
          Theo dõi trạng thái xử lý, thanh toán và chi tiết giao hàng của các đơn phát sinh trên website SRX.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tổng đơn</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.total.toLocaleString("vi-VN")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Chờ xác nhận</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.pending.toLocaleString("vi-VN")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Đang giao</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.shipping.toLocaleString("vi-VN")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Doanh thu đơn lọc</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(summary.revenue)}</CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo mã đơn, khách hàng, điện thoại, địa chỉ..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:w-[420px]">
          <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái đơn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái đơn</SelectItem>
              {srxOrderStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {getOrderStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Thanh toán" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái thanh toán</SelectItem>
              {srxOrderPaymentStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {getPaymentStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable
          key={tableRenderKey}
          table={table}
          columns={columns}
          tableClassName="min-w-[1520px]"
          headClassName="h-12 px-3 text-sm"
          rowClassName="[&>td]:border-border/70"
          cellClassName="px-3 py-4 align-top"
        />
      </div>
    </div>
  );
}
