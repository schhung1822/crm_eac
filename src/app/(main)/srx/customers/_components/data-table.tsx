"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Button } from "@/components/ui/button";
import { ExportDialog, type ExportFormat, type DateRange } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";

import { createDashboardColumns } from "./columns";
import { Users } from "./schema";

export function DataTable({ data: initialData }: { data: Users[] }) {
  const [data, setData] = React.useState<Users[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [pendingCustomerId, setPendingCustomerId] = React.useState<string | null>(null);

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.full_name.toLowerCase().includes(term) ||
        item.display_name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.default_address.toLowerCase().includes(term),
    );
  }, [data, searchTerm]);

  const handleStatusChange = React.useCallback(async (customerId: string, status: Users["status"]) => {
    try {
      setPendingCustomerId(customerId);

      const response = await fetch(`/api/srx/customers/${encodeURIComponent(customerId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể cập nhật trạng thái khách hàng");
      }

      setData((current) => current.map((item) => (item.id === customerId ? { ...item, ...result.customer } : item)));
      toast.success("Đã cập nhật trạng thái khách hàng website");
    } catch (error) {
      console.error("Update SRX customer status error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái khách hàng");
    } finally {
      setPendingCustomerId(null);
    }
  }, []);

  const columns = React.useMemo(
    () =>
      withDndColumn(
        createDashboardColumns({
          pendingCustomerId,
          onStatusChange: handleStatusChange,
        }),
      ),
    [handleStatusChange, pendingCustomerId],
  );

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row.id.toString(),
  });

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        let dataToExport = filteredData;

        if (dateRange.from || dateRange.to) {
          dataToExport = filterDataByDateRange(filteredData, "created_at", dateRange);
        }

        const headers = {
          id: "ID khách hàng",
          full_name: "Họ tên",
          display_name: "Tên hiển thị",
          email: "Email",
          phone: "Số điện thoại",
          gender: "Giới tính",
          status: "Trạng thái",
          date_of_birth: "Ngày sinh",
          is_email_verified: "Đã xác minh email",
          default_address: "Địa chỉ mặc định",
          address_label: "Nhãn địa chỉ",
          recipient_name: "Người nhận",
          recipient_phone: "SĐT người nhận",
          order_count: "Số đơn hàng",
          total_spent: "Tổng chi tiêu",
          last_order_at: "Đơn gần nhất",
          created_at: "Ngày tạo",
          last_login_at: "Lần đăng nhập cuối",
        };

        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `srx_customers_${dateStr}`;

        exportData({
          format,
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} khách hàng website thành công`);
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
            placeholder="Tìm theo tên, email, SĐT hoặc địa chỉ..."
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
      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu khách hàng website"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu khách hàng từ SRX Beauty Shop"
      />
    </div>
  );
}
