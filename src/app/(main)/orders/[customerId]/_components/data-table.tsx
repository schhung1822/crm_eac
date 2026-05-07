"use client";

import * as React from "react";

import { Plus, Search } from "lucide-react";
import { z } from "zod";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { dashboardColumns as makeColumns, type Stats } from "../../_components/columns";
import { channelSchema, Channel } from "../../_components/schema";

export function DataTable({ data: initialData }: { data: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData ?? []);
  const [searchTerm, setSearchTerm] = React.useState("");

  const stats = React.useMemo(() => {
    const totalOrders = (data ?? []).length;
    const totalTienHang = (data ?? []).reduce((s, r) => s + (Number(r.tien_hang) || 0), 0);
    const totalThanhTien = (data ?? []).reduce((s, r) => s + (Number(r.thanh_tien) || 0), 0);
    const totalQuantity = (data ?? []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    return { totalOrders, totalTienHang, totalThanhTien, totalQuantity };
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return (data ?? []).filter(
      (item) =>
        String(item.order_ID ?? "")
          .toLowerCase()
          .includes(term) ||
        String(item.name_customer ?? "")
          .toLowerCase()
          .includes(term) ||
        String(item.phone ?? "")
          .toLowerCase()
          .includes(term) ||
        String(item.seller ?? "")
          .toLowerCase()
          .includes(term) ||
        String(item.name_pro ?? "")
          .toLowerCase()
          .includes(term),
    );
  }, [data, searchTerm]);

  const columns = React.useMemo(() => withDndColumn(makeColumns(stats)), [stats]);
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row, index) =>
      String(
        row.id ||
          `${row.order_ID}-${row.pro_ID}-${row.create_time instanceof Date ? row.create_time.toISOString() : row.create_time}-${index}`,
      ),
  });

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
          <Button variant="outline" size="sm">
            d
            <Plus />
            <span className="hidden lg:inline">Xuất</span>
          </Button>
        </div>
      </div>
      <div className="table-scroll overflow-hidden rounded-lg">
        <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>
    </div>
  );
}
