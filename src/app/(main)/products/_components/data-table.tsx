"use client";

import * as React from "react";

import { ChevronDown, Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";

import { dashboardColumns } from "./columns";
import { ProductExportDialog, type ProductExportSelection } from "./product-export-dialog";
import type { Product } from "./schema";

const DEFAULT_BRANDS = ["SRX", "Simildiet", "POSM"];

function normalizeBrand(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function toFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase("vi-VN");
}

export function DataTable({ data: initialData }: { data: Product[] }) {
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>(DEFAULT_BRANDS);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const activeBrandOptions = React.useMemo(() => {
    const labelsByKey = new Map(DEFAULT_BRANDS.map((brand) => [normalizeBrand(brand), brand]));
    const countsByKey = new Map<string, number>();

    for (const item of initialData) {
      if (!item.isActive || !item.brand.trim()) continue;

      const brand = item.brand.trim();
      const key = normalizeBrand(brand);
      labelsByKey.set(key, labelsByKey.get(key) ?? brand);
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
    }

    const defaultKeys = new Set(DEFAULT_BRANDS.map(normalizeBrand));
    const extraBrands = [...labelsByKey.entries()]
      .filter(([key]) => !defaultKeys.has(key))
      .map(([, label]) => label)
      .sort((left, right) => left.localeCompare(right, "vi"));

    return [...DEFAULT_BRANDS, ...extraBrands].map((label) => ({
      label,
      count: countsByKey.get(normalizeBrand(label)) ?? 0,
    }));
  }, [initialData]);

  const selectedBrandKeys = React.useMemo(() => new Set(selectedBrands.map(normalizeBrand)), [selectedBrands]);

  const currentStatusData = React.useMemo(
    () => initialData.filter((item) => (status === "active" ? item.isActive : !item.isActive)),
    [initialData, status],
  );

  const statusData = React.useMemo(() => {
    if (status === "inactive") {
      return currentStatusData;
    }

    return currentStatusData.filter((item) => selectedBrandKeys.has(normalizeBrand(item.brand)));
  }, [currentStatusData, selectedBrandKeys, status]);

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return statusData;

    const term = searchTerm.toLowerCase();
    return statusData.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.pro_ID.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        (item.property ? item.property.toLowerCase().includes(term) : false),
    );
  }, [searchTerm, statusData]);

  const totals = React.useMemo(
    () =>
      statusData.reduce(
        (result, item) => ({
          soldQuantity: result.soldQuantity + item.soldQuantity,
          salesRevenue: result.salesRevenue + item.salesRevenue,
        }),
        { soldQuantity: 0, salesRevenue: 0 },
      ),
    [statusData],
  );

  const statusCounts = React.useMemo(
    () => ({
      active: initialData.filter((item) => item.isActive && selectedBrandKeys.has(normalizeBrand(item.brand))).length,
      inactive: initialData.filter((item) => !item.isActive).length,
    }),
    [initialData, selectedBrandKeys],
  );

  const exportBrandOptions = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const item of currentStatusData) {
      const label = item.brand.trim();
      if (!label) continue;

      const key = normalizeBrand(label);
      const current = counts.get(key);
      counts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 });
    }

    return [...counts.values()].sort((left, right) => left.label.localeCompare(right.label, "vi"));
  }, [currentStatusData]);

  const toggleBrand = React.useCallback((brand: string, checked: boolean) => {
    setSelectedBrands((current) => {
      const brandKey = normalizeBrand(brand);
      const isSelected = current.some((selectedBrand) => normalizeBrand(selectedBrand) === brandKey);

      if (checked && !isSelected) return [...current, brand];
      if (!checked) return current.filter((selectedBrand) => normalizeBrand(selectedBrand) !== brandKey);
      return current;
    });
  }, []);

  const columns = dashboardColumns;
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    defaultPageSize: 20,
    getRowId: (row) => row.pro_ID.toString(),
  });
  const sortingKey = table
    .getState()
    .sorting.map((item) => `${item.id}:${item.desc ? "desc" : "asc"}`)
    .join("|");
  const brandFilterKey = [...selectedBrandKeys].sort().join("|");
  const searchKey = searchTerm.trim().toLocaleLowerCase("vi-VN");

  const handleExport = React.useCallback(
    (selection: ProductExportSelection) => {
      setIsExporting(true);

      try {
        const sourceData =
          selection.scope === "all"
            ? currentStatusData
            : currentStatusData.filter((item) => normalizeBrand(item.brand) === normalizeBrand(selection.brand));
        const dataToExport = sourceData.map((item) => ({
          ...item,
          isActive: item.isActive ? "Đang bán" : "Ngừng bán",
        }));

        const headers = {
          pro_ID: "Mã sản phẩm",
          name: "Tên sản phẩm",
          brand: "Thương hiệu",
          class: "Phân loại",
          gia_ban: "Giá bán",
          gia_von: "Giá vốn",
          isActive: "Trạng thái",
          soldQuantity: "Số lượng đã bán",
          salesRevenue: "Doanh thu đơn hoàn thành",
        };

        const dateStr = new Date().toISOString().split("T")[0];
        const statusPart = status === "active" ? "dang-ban" : "ngung-ban";
        const brandPart = selection.scope === "brand" ? `_${toFilenamePart(selection.brand)}` : "_tat-ca";
        const filename = `products_${statusPart}${brandPart}_${dateStr}`;

        exportData({
          format: "csv",
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} sản phẩm thành công!`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [currentStatusData, status],
  );

  return (
    <Tabs
      value={status}
      onValueChange={(value) => setStatus(value as "active" | "inactive")}
      className="flex w-full flex-col gap-4"
    >
      <TabsList className="h-auto w-fit rounded-xl p-1">
        <TabsTrigger value="active" className="px-4 py-2">
          Đang bán ({statusCounts.active.toLocaleString("vi-VN")})
        </TabsTrigger>
        <TabsTrigger value="inactive" className="px-4 py-2">
          Ngừng bán ({statusCounts.inactive.toLocaleString("vi-VN")})
        </TabsTrigger>
      </TabsList>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs font-medium">Sản phẩm trong danh mục</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{statusData.length.toLocaleString("vi-VN")}</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs font-medium">Số sản phẩm đã bán</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{totals.soldQuantity.toLocaleString("vi-VN")}</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs font-medium">Doanh thu đơn hoàn thành</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">
              {Math.round(totals.salesRevenue).toLocaleString("vi-VN")}đ
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Tìm theo tên, mã, thương hiệu..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {status === "active" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between sm:w-56">
                  <span>Thương hiệu ({selectedBrands.length})</span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
                <DropdownMenuLabel>Chọn thương hiệu đang bán</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activeBrandOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.label}
                    checked={selectedBrandKeys.has(normalizeBrand(option.label))}
                    onCheckedChange={(checked) => toggleBrand(option.label, checked === true)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">{option.count}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={currentStatusData.length === 0}
          >
            <Download className="size-4" />
            <span className="hidden lg:inline">Xuất</span>
          </Button>
        </div>
      </div>
      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTableNew
          key={`${status}-${brandFilterKey}-${searchKey}-${sortingKey}`}
          table={table}
          columns={columns}
          defaultPageSize={20}
        />
      </div>

      <ProductExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        statusLabel={status === "active" ? "Đang bán" : "Ngừng bán"}
        totalCount={currentStatusData.length}
        brands={exportBrandOptions}
      />
    </Tabs>
  );
}
