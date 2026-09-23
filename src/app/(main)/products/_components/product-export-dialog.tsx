"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type ProductExportSelection =
  | { scope: "all" }
  | {
      scope: "brand";
      brand: string;
    };

type BrandOption = {
  label: string;
  count: number;
};

type ProductExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (selection: ProductExportSelection) => void;
  isExporting: boolean;
  statusLabel: string;
  totalCount: number;
  brands: BrandOption[];
};

export function ProductExportDialog({
  open,
  onOpenChange,
  onExport,
  isExporting,
  statusLabel,
  totalCount,
  brands,
}: ProductExportDialogProps) {
  const [scope, setScope] = React.useState<"all" | "brand">("all");
  const [selectedBrand, setSelectedBrand] = React.useState("");
  const [brandSearch, setBrandSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;

    setScope("all");
    setSelectedBrand("");
    setBrandSearch("");
  }, [open, statusLabel]);

  const filteredBrands = React.useMemo(() => {
    const term = brandSearch.trim().toLocaleLowerCase("vi-VN");
    if (!term) return brands;

    return brands.filter((brand) => brand.label.toLocaleLowerCase("vi-VN").includes(term));
  }, [brandSearch, brands]);

  const handleExport = () => {
    if (scope === "brand") {
      if (!selectedBrand) return;
      onExport({ scope: "brand", brand: selectedBrand });
      return;
    }

    onExport({ scope: "all" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu sản phẩm</DialogTitle>
          <DialogDescription>Chọn phạm vi xuất trong tab {statusLabel.toLocaleLowerCase("vi-VN")}.</DialogDescription>
        </DialogHeader>

        <RadioGroup value={scope} onValueChange={(value) => setScope(value as "all" | "brand")}>
          <Label
            htmlFor="product-export-all"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
              scope === "all" && "border-primary bg-primary/5",
            )}
          >
            <RadioGroupItem id="product-export-all" value="all" className="mt-0.5" />
            <span className="space-y-1">
              <span className="block font-medium">Xuất tất cả</span>
              <span className="text-muted-foreground block text-xs">
                {totalCount.toLocaleString("vi-VN")} sản phẩm trong tab {statusLabel.toLocaleLowerCase("vi-VN")}
              </span>
            </span>
          </Label>

          <Label
            htmlFor="product-export-brand"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
              scope === "brand" && "border-primary bg-primary/5",
            )}
          >
            <RadioGroupItem id="product-export-brand" value="brand" className="mt-0.5" />
            <span className="space-y-1">
              <span className="block font-medium">Xuất theo thương hiệu</span>
              <span className="text-muted-foreground block text-xs">Chọn một thương hiệu để tạo file riêng</span>
            </span>
          </Label>
        </RadioGroup>

        {scope === "brand" ? (
          <div className="space-y-2">
            <Input
              value={brandSearch}
              onChange={(event) => setBrandSearch(event.target.value)}
              placeholder="Tìm thương hiệu..."
              autoFocus
            />
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-1">
              {filteredBrands.length === 0 ? (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">Không tìm thấy thương hiệu.</p>
              ) : (
                filteredBrands.map((brand) => (
                  <button
                    key={brand.label}
                    type="button"
                    className={cn(
                      "hover:bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                      selectedBrand === brand.label && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    onClick={() => setSelectedBrand(brand.label)}
                  >
                    <span className="truncate">{brand.label}</span>
                    <span className="ml-3 shrink-0 text-xs tabular-nums opacity-70">
                      {brand.count.toLocaleString("vi-VN")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Hủy
          </Button>
          <Button onClick={handleExport} disabled={isExporting || (scope === "brand" && !selectedBrand)}>
            {isExporting ? "Đang xuất..." : "Xuất CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
