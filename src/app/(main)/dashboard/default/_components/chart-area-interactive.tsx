"use client";

import { memo } from "react";

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { ChartPoint } from "./types";

const chartConfig = {
  revenue: {
    label: "Doanh thu hoàn thành",
    color: "#16a34a",
  },
  orders: {
    label: "Đơn hàng",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export function formatVNDShort(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  }

  if (absoluteValue >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  }

  if (absoluteValue >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("vi-VN")}k`;
  }

  return value.toLocaleString("vi-VN");
}

function formatDate(value: string, withYear = false) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: withYear ? "numeric" : undefined,
  });
}

export const ChartAreaInteractive = memo(function ChartAreaInteractive({ chartData }: { chartData: ChartPoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Xu hướng bán hàng</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-[320px] items-center justify-center rounded-xl border border-dashed text-sm">
            Chưa có dữ liệu bán hàng trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[320px] min-h-[320px] w-full min-w-0">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={(value) => formatDate(String(value))}
              />
              <YAxis
                yAxisId="revenue"
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value) => formatVNDShort(Number(value))}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Ngày ${formatDate(String(value), true)}`}
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-6">
                        <span className="text-muted-foreground">
                          {name === "revenue" ? "Doanh thu hoàn thành" : "Đơn hàng"}
                        </span>
                        <span className="font-medium tabular-nums">
                          {name === "revenue" ? formatCurrency(Number(value)) : Number(value).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--color-orders)" }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
});
