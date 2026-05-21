"use client";
import * as React from "react";

import Link from "next/link";

import { Download, LayoutTemplate, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportDialog, type ExportFormat, type DateRange } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";

import { dashboardColumns } from "./columns";
import { EventsSummary } from "./events-summary";
import { Academy } from "./schema";

const colorPalette = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

export function DataTable({ data: initialData }: { data: Academy[] }) {
  const [data, setData] = React.useState<Academy[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedEvent, setSelectedEvent] = React.useState<string>("all");
  const [renderKey, setRenderKey] = React.useState(0);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const eventNames = React.useMemo(() => {
    const names = new Set(data.map((item) => item.event_name).filter(Boolean));
    return Array.from(names).sort();
  }, [data]);

  const filteredData = React.useMemo(() => {
    let filtered = data;

    if (selectedEvent !== "all") {
      filtered = filtered.filter((item) => item.event_name === selectedEvent);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.phone.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.user_id.toLowerCase().includes(term) ||
          item.oa_interest.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [data, searchTerm, selectedEvent]);

  const totalCheckins = filteredData.length;
  const totalOaInterested = React.useMemo(
    () => filteredData.filter((item) => item.oa_interest === "Quan tâm").length,
    [filteredData],
  );

  const nghềData = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach((item) => {
      const key = (item.q2 || "Không rõ").trim() || "Không rõ";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const rows = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = rows.slice(0, 6);
    const rest = rows.slice(6).reduce((acc, cur) => acc + cur.value, 0);
    if (rest > 0) {
      top.push({ name: "Khác", value: rest });
    }

    return top.map((item, index) => ({
      ...item,
      fill: colorPalette[index % colorPalette.length],
    }));
  }, [filteredData]);

  const eventRatioData = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach((item) => {
      const key = (item.event_name || "Không rõ").trim() || "Không rõ";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const rows = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = rows.slice(0, 6);
    const rest = rows.slice(6).reduce((acc, cur) => acc + cur.value, 0);
    if (rest > 0) {
      top.push({ name: "Khác", value: rest });
    }

    return top.map((item, index) => ({
      ...item,
      fill: colorPalette[index % colorPalette.length],
    }));
  }, [filteredData]);

  const columns = withDndColumn(dashboardColumns);
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row.phone.toString(),
  });

  React.useEffect(() => {
    table.resetRowSelection();
    table.setPageIndex(0);
    setRenderKey((prev) => prev + 1);
  }, [selectedEvent, searchTerm, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);
      void dateRange;

      try {
        const dataToExport = filteredData;
        const headers = {
          name: "Tên",
          phone: "Số điện thoại",
          email: "Email",
          title_q1: "Câu hỏi 1",
          q1: "Trả lời 1",
          title_q2: "Câu hỏi 2",
          q2: "Trả lời 2",
          title_q3: "Câu hỏi 3",
          q3: "Trả lời 3",
          title_q4: "Câu hỏi 4",
          q4: "Trả lời 4",
          title_q5: "Câu hỏi 5",
          q5: "Trả lời 5",
          voucher: "Voucher",
          event_name: "Tên sự kiện",
          user_id: "User ID",
          oa_interest: "Quan tâm OA",
        };
        const eventName = selectedEvent !== "all" ? `_${selectedEvent}` : "";
        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `events${eventName}_${dateStr}`;

        exportData({
          format,
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} dòng dữ liệu thành công!`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [filteredData, selectedEvent],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <EventsSummary
        totalCheckins={totalCheckins}
        totalOaInterested={totalOaInterested}
        nghềData={nghềData}
        eventRatioData={eventRatioData}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Tìm kiếm theo tên, SĐT, email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn sự kiện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả sự kiện</SelectItem>
              {eventNames.map((eventName) => (
                <SelectItem key={eventName} value={eventName}>
                  {eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(selectedEvent !== "all" || searchTerm) && (
            <Badge variant="secondary" className="ml-2">
              {filteredData.length} / {data.length} kết quả
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button className="cursor-pointer" variant="outline" size="sm" asChild>
            <Link className="cursor-pointer" href="/srx/ladipage-events">
              <LayoutTemplate />
              <span className="hidden lg:inline">Ladipage sự kiện</span>
            </Link>
          </Button>
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
      <div className="nice-scroll overflow-hidden rounded-lg" key={renderKey}>
        <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu sự kiện"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu sự kiện"
      />
    </div>
  );
}
