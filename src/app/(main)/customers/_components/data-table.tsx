"use client";

import * as React from "react";

import { Building2, ChevronDown, Download, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDialog, type ExportFormat, type DateRange } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";

import { dashboardColumns } from "./columns";
import { Users } from "./schema";

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type CustomerFilterProps = {
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
};

function CustomerFilter({ label, icon, options, selected, onChange }: CustomerFilterProps) {
  const buttonLabel =
    selected.size === 0 ? label : selected.size === 1 ? options.find((item) => selected.has(item.value))?.label : label;

  const toggleOption = (value: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(value);
    else next.delete(value);
    onChange(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-56 justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{buttonLabel}</span>
            {selected.size > 1 ? (
              <span className="bg-muted rounded px-1.5 py-0.5 text-xs tabular-nums">{selected.size}</span>
            ) : null}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value || "__empty"}
              checked={selected.has(option.value)}
              onCheckedChange={(checked) => toggleOption(option.value, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{option.count}</span>
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuItem disabled>Chưa có dữ liệu</DropdownMenuItem>
        )}
        {selected.size > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange(new Set())}>
              <X className="size-4" />
              Xóa bộ lọc
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildFilterOptions(data: Users[], getValue: (item: Users) => string, emptyLabel: string): FilterOption[] {
  const counts = new Map<string, number>();
  data.forEach((item) => {
    const value = getValue(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts, ([value, count]) => ({ value, label: value || emptyLabel, count })).sort((a, b) =>
    a.label.localeCompare(b.label, "vi"),
  );
}

export function DataTable({ data }: { data: Users[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCreators, setSelectedCreators] = React.useState<Set<string>>(() => new Set());
  const [selectedBranches, setSelectedBranches] = React.useState<Set<string>>(() => new Set());
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const creatorOptions = React.useMemo(
    () => buildFilterOptions(data, (item) => item.create_by, "Chưa rõ người tạo"),
    [data],
  );
  const branchOptions = React.useMemo(
    () => buildFilterOptions(data, (item) => item.branch, "Chưa có chi nhánh"),
    [data],
  );

  const filteredData = React.useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("vi");

    return data.filter((item) => {
      if (selectedCreators.size > 0 && !selectedCreators.has(item.create_by)) return false;
      if (selectedBranches.size > 0 && !selectedBranches.has(item.branch)) return false;
      if (!term) return true;

      return [item.name, item.customer_ID, item.phone, item.create_by, item.branch, item.company, item.address].some(
        (value) => value.toLocaleLowerCase("vi").includes(term),
      );
    });
  }, [data, searchTerm, selectedBranches, selectedCreators]);

  const table = useDataTableInstance({
    data: filteredData,
    columns: dashboardColumns,
    getRowId: (row) => row.customer_ID,
  });
  const tableRefreshKey = JSON.stringify({
    search: searchTerm,
    creators: Array.from(selectedCreators).sort(),
    branches: Array.from(selectedBranches).sort(),
  });

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        let dataToExport = filteredData;

        if (dateRange.from || dateRange.to) {
          dataToExport = filterDataByDateRange(filteredData, "create_time", dateRange);
        }

        const headers = {
          customer_ID: "Mã khách hàng",
          name: "Tên khách hàng",
          phone: "Số điện thoại",
          class: "Phân loại",
          gender: "Giới tính",
          birth: "Ngày sinh",
          create_time: "Ngày tạo",
          last_payment: "Thanh toán gần nhất",
          company: "Công ty",
          address: "Địa chỉ",
          create_by: "Người tạo",
          note: "Ghi chú",
          branch: "Chi nhánh",
          no_hien_tai: "Nợ hiện tại",
          tong_ban: "Tổng bán",
          tong_ban_tru_tra_hang: "Tổng bán trừ trả hàng",
        };

        exportData({
          format,
          data: dataToExport,
          headers,
          filename: `customers_${new Date().toISOString().split("T")[0]}`,
        });

        toast.success(`Xuất ${dataToExport.length} khách hàng thành công!`);
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
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Tìm tên, mã, SĐT, địa chỉ..."
              className="bg-background pl-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <CustomerFilter
            label="Người tạo"
            icon={<UserRound className="size-4 shrink-0" />}
            options={creatorOptions}
            selected={selectedCreators}
            onChange={setSelectedCreators}
          />
          <CustomerFilter
            label="Chi nhánh"
            icon={<Building2 className="size-4 shrink-0" />}
            options={branchOptions}
            selected={selectedBranches}
            onChange={setSelectedBranches}
          />
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="text-muted-foreground text-xs tabular-nums">
            {filteredData.length.toLocaleString("vi-VN")} / {data.length.toLocaleString("vi-VN")} khách hàng
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
        key={tableRefreshKey}
        table={table}
        columns={dashboardColumns}
        tableClassName="min-w-[960px]"
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
        title="Xuất dữ liệu khách hàng"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu khách hàng"
      />
    </div>
  );
}
