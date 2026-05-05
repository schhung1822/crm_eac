"use client";

import { Crown, Medal, TrendingUp } from "lucide-react";
import { Funnel, FunnelChart, LabelList } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { salesPipelineChartConfig } from "./crm.config";

type BrandFunnelItem = { stage: string; value: number; fill: string };
type ProductRankItem = { product: string; quantity: number; percentage: number };
type SalesRankItem = { seller: string; revenue: number; orders: number };

const medalClasses = [
  "border-slate-300/30 bg-slate-400/10 text-slate-200",
  "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "border-orange-400/40 bg-orange-400/10 text-orange-300",
];

function getMedalClass(index: number) {
  switch (index) {
    case 0:
      return medalClasses[0];
    case 1:
      return medalClasses[1];
    default:
      return medalClasses[2];
  }
}

function getMedalIcon(index: number) {
  switch (index) {
    case 0:
      return Medal;
    case 1:
      return Crown;
    default:
      return Medal;
  }
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
  const formatVND = (value: number) => value.toLocaleString("vi-VN");
  const totalProducts = topProducts.reduce((sum, product) => sum + product.quantity, 0);
  const totalSalesRevenue = topSales.reduce((sum, seller) => sum + seller.revenue, 0);
  const leaderRevenue = topSales[0]?.revenue ?? 0;
  const podium = [topSales[1], topSales[0], topSales[2]].filter((item): item is SalesRankItem => Boolean(item));

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Phễu chuyển đổi theo thương hiệu</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-card stroke-2" dataKey="value" data={brandFunnel}>
                <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={10} />
                <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={10} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xếp hạng sản phẩm bán chạy</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            {formatVND(totalProducts)} sản phẩm bán ra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {topProducts.map((item, index) => (
              <div key={item.product} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">#{index + 1}</span>
                    <span className="truncate text-sm font-medium">{item.product}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-baseline gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatVND(item.quantity)}</span>
                    <TrendingUp className="size-3 text-green-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={item.percentage} />
                  <span className="text-muted-foreground text-xs font-medium tabular-nums">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xếp hạng doanh thu sale</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            {formatVND(topSales.length)} sale • {formatVND(totalSalesRevenue)} VNĐ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topSales.length === 0 ? (
            <div className="text-muted-foreground flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
              Chưa có dữ liệu doanh thu sale.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {podium.map((item, index) => {
                  const Icon = getMedalIcon(index);
                  const rank = item.seller === topSales[0]?.seller ? 1 : item.seller === topSales[1]?.seller ? 2 : 3;
                  const share = totalSalesRevenue > 0 ? (item.revenue / totalSalesRevenue) * 100 : 0;

                  return (
                    <div
                      key={`${item.seller}-${rank}`}
                      className={cn(
                        "rounded-2xl border p-4",
                        getMedalClass(index),
                        rank === 1 ? "md:-mt-3 md:pb-6" : "",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-background/80 text-foreground flex size-8 items-center justify-center rounded-full text-sm font-bold">
                            {rank}
                          </span>
                          <Icon className="size-4" />
                        </div>
                        <TrendingUp className="size-4" />
                      </div>
                      <div className="truncate text-sm font-semibold">{item.seller}</div>
                      <div className="mt-2 text-lg font-bold tabular-nums">{formatVND(item.revenue)} VNĐ</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {formatVND(item.orders)} đơn • {share.toFixed(1)}% tổng doanh thu sale
                      </div>
                    </div>
                  );
                })}
              </div>

              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-2.5">
                  {topSales.map((item, index) => {
                    const share = leaderRevenue > 0 ? (item.revenue / leaderRevenue) * 100 : 0;

                    return (
                      <div key={item.seller} className="rounded-xl border px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="truncate text-sm font-semibold">{item.seller}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={Math.min(share, 100)} className="h-2" />
                              <span className="text-muted-foreground w-12 text-right text-xs">{share.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-semibold tabular-nums">{formatVND(item.revenue)} VNĐ</div>
                            <div className="text-muted-foreground mt-1">{formatVND(item.orders)} đơn</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}
