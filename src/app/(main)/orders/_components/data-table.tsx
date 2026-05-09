"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";

// ⬇️ import thêm Stats + columns factory
import { dashboardColumns as makeColumns, type Stats } from "./columns";
import type { Channel } from "./schema";
import { filterOrdersBySearchTerm } from "./search-utils";

export function DataTable({ data: initialData = [] }: { data?: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  // compute summary stats (used by columns factory)
  const stats: Stats = React.useMemo(
    () => ({
      totalOrders: initialData.length,
      totalTienHang: initialData.reduce((s, c) => s + (Number(c.tien_hang) || 0), 0),
      totalThanhTien: initialData.reduce((s, c) => s + (Number(c.thanh_tien) || 0), 0),
      totalQuantity: initialData.reduce((s, c) => s + (Number(c.quantity) || 0), 0),
    }),
    [initialData],
  );

  // build columns from factory
  const columns = React.useMemo(() => withDndColumn(makeColumns(stats)), [stats]);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredData = React.useMemo(() => filterOrdersBySearchTerm(data, searchTerm), [data, searchTerm]);

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
        let dataToExport = filteredData;

        if (dateRange.from || dateRange.to) {
          dataToExport = filterDataByDateRange(filteredData, "create_time", dateRange);
        }

        const headers = {
          brand: "Thương hiệu",
          order_ID: "Mã đơn hàng",
          create_time: "Thời gian tạo",
          customer_ID: "Mã khách hàng",
          name_customer: "Tên khách hàng",
          phone: "Số điện thoại",
          address: "Địa chỉ",
          seller: "Người bán",
          kenh_ban: "Kênh bán",
          note: "Ghi chú",
          tien_hang: "Tiền hàng",
          giam_gia: "Giảm giá",
          thanh_tien: "Thành tiền",
          status: "Trạng thái",
          quantity: "Số lượng",
          pro_ID: "Mã sản phẩm",
          name_pro: "Tên sản phẩm",
          brand_pro: "Thương hiệu sản phẩm",
        };

        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `orders_${dateStr}`;

        exportData({
          format,
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} đơn hàng thành công!`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [filteredData],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Tìm kiếm theo tên, mã, SĐT, người tạo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={filteredData.length === 0}
          >
            <Download className="size-4" />
            <span className="hidden lg:inline">Xuất</span>
          </Button>
        </div>
      </div>
      <div className="nice-scroll overflow-x-auto rounded-lg">
        <DataTableNew key={tableRenderKey} dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu đơn hàng"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu đơn hàng"
      />
    </div>
  );
}
