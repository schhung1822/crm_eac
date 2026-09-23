"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Product } from "./schema";

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-xl border p-4">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div
        className={
          accent ? "text-primary mt-2 text-lg font-semibold tabular-nums" : "mt-2 text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export function TableCellViewer({ item, trigger }: { item: Product; trigger?: React.ReactElement }) {
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button variant="link" className="text-foreground h-auto max-w-full justify-start px-0 text-left">
            <span className="truncate">{item.name}</span>
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="h-[85dvh] sm:ml-auto sm:h-[100dvh] sm:max-w-[520px]">
        <DrawerHeader className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 gap-3 border-b px-5 py-5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Đang bán" : "Ngừng bán"}</Badge>
            {item.brand ? <Badge variant="outline">{item.brand}</Badge> : null}
            {item.class ? <Badge variant="outline">{item.class}</Badge> : null}
          </div>

          <div className="space-y-1.5">
            <DrawerTitle className="text-xl leading-snug tracking-tight">{item.name}</DrawerTitle>
            <DrawerDescription>
              Mã sản phẩm: <span className="text-foreground font-mono font-medium">{item.pro_ID}</span>
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-sm font-semibold">Tổng quan kinh doanh</h3>
              <span className="text-muted-foreground text-xs">Chỉ tính đơn hoàn thành</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Giá bán" value={formatMoney(item.gia_ban)} />
              <Metric label="Giá vốn" value={formatMoney(item.gia_von)} />
              <Metric label="Số lượng đã bán" value={formatNumber(item.soldQuantity)} />
              <Metric label="Doanh thu" value={formatMoney(item.salesRevenue)} accent />
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="mb-4 text-sm font-semibold">Thông tin sản phẩm</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Mã sản phẩm" value={item.pro_ID} />
              <Detail label="Thương hiệu" value={item.brand} />
              <Detail label="Phân loại" value={item.class} />
              <Detail label="Trạng thái" value={item.isActive ? "Đang bán" : "Ngừng bán"} />
            </dl>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-semibold">Mô tả và thuộc tính</h3>
            <p className="text-muted-foreground text-sm leading-6 break-words whitespace-pre-wrap">
              {item.property?.trim() ? item.property : "Chưa có mô tả cho sản phẩm này."}
            </p>
          </section>
        </div>

        <DrawerFooter className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 border-t px-5 py-4 backdrop-blur">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Đóng
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
