"use client";

import * as React from "react";

import { Banknote, Download, PackageCheck, ReceiptText, Search, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";

import type { Channel } from "../../_components/schema";
import { filterOrdersBySearchTerm } from "../../_components/search-utils";

import { createCustomerOrderColumns, type CustomerOrderStats } from "./columns";

function summarizeOrders(data: Channel[]): CustomerOrderStats {
  const distinctOrders = new Map<string, Channel>();
  data.forEach((row) => {
    if (!distinctOrders.has(row.order_ID)) distinctOrders.set(row.order_ID, row);
  });

  const orders = Array.from(distinctOrders.values());
  return {
    totalOrders: orders.length,
    totalTienHang: orders.reduce((sum, row) => sum + row.tien_hang, 0),
    totalThanhTien: orders.reduce((sum, row) => sum + row.thanh_tien, 0),
    totalQuantity: data.reduce((sum, row) => sum + row.quantity, 0),
  };
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs font-medium">{label}</div>
          <div className="truncate text-xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DataTable({ data, customerId }: { data: Channel[]; customerId: string }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const filteredData = React.useMemo(() => filterOrdersBySearchTerm(data, searchTerm), [data, searchTerm]);
  const stats = React.useMemo(() => summarizeOrders(filteredData), [filteredData]);
  const columns = React.useMemo(() => createCustomerOrderColumns(stats), [stats]);
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row, index) =>
      String(
        row.id ||
          `${row.order_ID}-${row.pro_ID}-${row.create_time instanceof Date ? row.create_time.toISOString() : row.create_time}-${index}`,
      ),
  });
  const tableRenderKey = `${searchTerm}|${filteredData.length}`;

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        const dataToExport =
          dateRange.from || dateRange.to ? filterDataByDateRange(filteredData, "create_time", dateRange) : filteredData;
        const date = new Date().toISOString().split("T")[0];
        const safeCustomerId = customerId.replace(/[^a-zA-Z0-9_-]+/g, "_") || "customer";

        exportData({
          format,
          data: dataToExport,
          headers: {
            order_ID: "Mã đơn hàng",
            create_time: "Thời gian tạo",
            customer_ID: "Mã khách hàng",
            name_customer: "Tên khách hàng",
            phone: "Số điện thoại",
            address: "Địa chỉ",
            seller: "Người bán",
            kenh_ban: "Kênh bán",
            brand: "Thương hiệu",
            status: "Trạng thái",
            pro_ID: "Mã sản phẩm",
            name_pro: "Tên sản phẩm",
            brand_pro: "Thương hiệu sản phẩm",
            quantity: "Số lượng",
            tien_hang: "Tiền hàng",
            giam_gia: "Giảm giá",
            thanh_tien: "Thành tiền",
            note: "Ghi chú",
          },
          filename: `orders_${safeCustomerId}_${date}`,
        });

        const exportedOrderCount = new Set(dataToExport.map((row) => row.order_ID)).size;
        toast.success(`Đã xuất ${exportedOrderCount} đơn hàng thành công`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [customerId, filteredData],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<ReceiptText className="size-5" />}
          label="Đơn hàng"
          value={stats.totalOrders.toLocaleString("vi-VN")}
        />
        <SummaryCard
          icon={<ShoppingBasket className="size-5" />}
          label="Sản phẩm"
          value={stats.totalQuantity.toLocaleString("vi-VN")}
        />
        <SummaryCard
          icon={<PackageCheck className="size-5" />}
          label="Tiền hàng"
          value={`${stats.totalTienHang.toLocaleString("vi-VN")} đ`}
        />
        <SummaryCard
          icon={<Banknote className="size-5" />}
          label="Thành tiền"
          value={`${stats.totalThanhTien.toLocaleString("vi-VN")} đ`}
        />
      </div>

      <div className="bg-card/50 flex flex-col gap-3 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Tìm mã đơn, sản phẩm, người bán, trạng thái..."
            className="bg-background pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-muted-foreground text-xs tabular-nums">
            {stats.totalOrders.toLocaleString("vi-VN")} đơn · {filteredData.length.toLocaleString("vi-VN")} sản phẩm
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={filteredData.length === 0}
          >
            <Download className="size-4" />
            Xuất
          </Button>
        </div>
      </div>

      <DataTableNew
        key={tableRenderKey}
        table={table}
        columns={columns}
        tableClassName="min-w-[920px]"
        headClassName="h-11"
        rowClassName="h-[68px]"
        cellClassName="px-3 py-2.5"
        defaultPageSize={20}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất đơn hàng của khách hàng"
        description="Chọn khoảng thời gian hoặc để trống để xuất toàn bộ kết quả hiện tại"
      />
    </div>
  );
}
