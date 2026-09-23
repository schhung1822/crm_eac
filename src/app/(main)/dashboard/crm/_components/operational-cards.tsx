"use client";

import { Funnel, FunnelChart, LabelList } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

import { salesPipelineChartConfig } from "./crm.config";

type BrandFunnelItem = { stage: string; value: number; fill: string };
type ProductRankItem = { product: string; quantity: number; percentage: number };
type SalesRankItem = { seller: string; revenue: number; orders: number };

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatCompactCurrency(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} tỷ`;
  }

  if (absoluteValue >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} triệu`;
  }

  return `${formatNumber(value)}đ`;
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex h-[280px] items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm">
      {children}
    </div>
  );
}

export function OperationalCards({
  brandFunnel,
  topProducts,
  topSales,
}: {
  brandFunnel: BrandFunnelItem[];
  topProducts: ProductRankItem[];
  topSales: SalesRankItem[];
}) {
  const leaderRevenue = topSales[0]?.revenue ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="gap-3">
        <CardHeader className="px-4">
          <CardTitle>Phễu chuyển đổi theo thương hiệu</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {brandFunnel.length === 0 ? (
            <EmptyState>Chưa có dữ liệu chuyển đổi theo thương hiệu.</EmptyState>
          ) : (
            <ChartContainer config={salesPipelineChartConfig} className="h-[280px] w-full">
              <FunnelChart margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                <Funnel className="stroke-card stroke-2" dataKey="value" data={brandFunnel}>
                  <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={8} />
                  <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={8} />
                </Funnel>
              </FunnelChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader className="px-4">
          <CardTitle>Sản phẩm bán chạy</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {topProducts.length === 0 ? (
            <EmptyState>Chưa có dữ liệu sản phẩm bán chạy.</EmptyState>
          ) : (
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-3">
                {topProducts.map((item, index) => (
                  <div key={item.product} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">{index + 1}</span>
                        <span className="truncate text-sm font-medium">{item.product}</span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatNumber(item.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <Progress value={item.percentage} className="h-1.5" />
                      <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader className="px-4">
          <CardTitle>Doanh thu theo sale</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {topSales.length === 0 ? (
            <EmptyState>Chưa có dữ liệu doanh thu sale.</EmptyState>
          ) : (
            <ScrollArea className="h-[280px] pr-3">
              <div className="divide-y">
                {topSales.map((item, index) => {
                  const ratio = leaderRevenue > 0 ? (item.revenue / leaderRevenue) * 100 : 0;

                  return (
                    <div key={item.seller} className="space-y-2 py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">{index + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{item.seller}</div>
                            <div className="text-muted-foreground text-xs tabular-nums">
                              {formatNumber(item.orders)} đơn
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatCompactCurrency(item.revenue)}
                        </span>
                      </div>
                      <Progress value={Math.min(ratio, 100)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
