"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { FullValue } from "./full-value";
import { PRIMARY_SERIES_COLOR } from "./report-colors";

export const REPORT_BODY_HEIGHT = "h-[300px]";

export function ReportCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("min-w-0 gap-4", className)}>
      <CardHeader className="px-5">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type RankedBarItem = {
  key: string;
  label: string;
  /** Tên đầy đủ / thông tin phụ khi rê chuột. */
  title?: string;
  value: number;
  valueLabel: string;
  /** Số đầy đủ khi `valueLabel` đã làm tròn — hiện khi rê chuột. */
  fullValue?: string;
  /** Thông tin ngắn dưới giá trị, vd. "12 đơn · 8,4%". Giữ ngắn để các thanh thẳng hàng. */
  meta?: string;
  color?: string;
};

/**
 * Danh sách xếp hạng dạng thanh ngang. Độ dài thanh so với dòng lớn nhất; số liệu luôn là chữ,
 * không phụ thuộc màu hay tooltip. Mặc định hiện `limit` dòng đầu, bấm để xem hết.
 */
export function RankedBarList({
  items,
  emptyText,
  limit = 6,
}: {
  items: RankedBarItem[];
  emptyText: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const visibleItems = expanded ? items : items.slice(0, limit);
  const hiddenCount = items.length - limit;

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {visibleItems.map((item) => {
          const width = maxValue > 0 ? Math.max((item.value / maxValue) * 100, item.value > 0 ? 1.5 : 0) : 0;

          return (
            <li key={item.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm" title={item.title ?? item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  <FullValue fullValue={item.fullValue}>{item.valueLabel}</FullValue>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${width}%`, background: item.color ?? PRIMARY_SERIES_COLOR }}
                  />
                </div>
                {item.meta ? (
                  <span className="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">
                    {item.meta}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {hiddenCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 h-7 px-2 text-xs"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Thu gọn" : `Xem thêm ${hiddenCount}`}
        </Button>
      ) : null}
    </div>
  );
}

/** Một thẻ gom nhiều bảng xếp hạng cùng chủ đề, chuyển qua lại bằng tab. */
export function TabbedReportCard({
  title,
  description,
  tabs,
  className,
}: {
  title: string;
  description?: ReactNode;
  tabs: Array<{ value: string; label: string; content: ReactNode }>;
  className?: string;
}) {
  return (
    <ReportCard title={title} description={description} className={className}>
      <Tabs defaultValue={tabs[0]?.value} className="gap-4">
        <TabsList className="w-full">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </ReportCard>
  );
}
