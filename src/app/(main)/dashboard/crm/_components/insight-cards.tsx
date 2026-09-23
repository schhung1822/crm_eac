"use client";

import { Pie, PieChart, Label, Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type PieDatum = { source: string; revenue: number; fill: string };
type BranchBarRow = { name: string; actual: number; remaining: number };

const formatVNDCompact = (n: number) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) {
    const x = v / 1_000_000_000;
    return `${x.toLocaleString("vi-VN", { maximumFractionDigits: x >= 10 ? 0 : 1 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    const x = v / 1_000_000;
    return `${x.toLocaleString("vi-VN", { maximumFractionDigits: x >= 10 ? 0 : 1 })} triệu`;
  }
  return v.toLocaleString("vi-VN");
};

export function InsightCards({
  revenueByChannel,
  revenueByBranchBars,
}: {
  revenueByChannel: { data: PieDatum[]; config: ChartConfig };
  revenueByBranchBars: { data: BranchBarRow[]; config: ChartConfig };
}) {
  const totalChannelRevenue = revenueByChannel.data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="gap-3">
        <CardHeader className="px-4">
          <CardTitle>Doanh thu theo kênh bán</CardTitle>
        </CardHeader>

        <CardContent className="px-4">
          {revenueByChannel.data.length === 0 ? (
            <div className="text-muted-foreground flex h-[250px] items-center justify-center rounded-lg border border-dashed text-sm">
              Chưa có dữ liệu doanh thu theo kênh bán.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ChartContainer config={revenueByChannel.config} className="h-[240px] w-full max-w-[240px] shrink-0">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel formatter={(v) => formatVNDCompact(Number(v))} />}
                  />
                  <Pie
                    data={revenueByChannel.data}
                    dataKey="revenue"
                    nameKey="source"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={2}
                    cornerRadius={4}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-xl font-bold tabular-nums"
                              >
                                {formatVNDCompact(totalChannelRevenue)}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 22}
                                className="fill-muted-foreground text-xs"
                              >
                                Tổng doanh thu
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="flex min-w-0 flex-1 flex-col divide-y">
                {revenueByChannel.data.map((item) => (
                  <div key={item.source} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.fill }} />
                      <span className="text-muted-foreground truncate text-xs">
                        {(revenueByChannel.config as any)[item.source]?.label ?? item.source}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums">{formatVNDCompact(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader className="px-4">
          <CardTitle>Doanh thu theo chi nhánh</CardTitle>
        </CardHeader>

        <CardContent className="px-4">
          {revenueByBranchBars.data.length === 0 ? (
            <div className="text-muted-foreground flex h-[250px] items-center justify-center rounded-lg border border-dashed text-sm">
              Chưa có dữ liệu doanh thu theo chi nhánh.
            </div>
          ) : (
            <ChartContainer config={revenueByBranchBars.config} className="h-[250px] w-full">
              <BarChart
                data={revenueByBranchBars.data}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 5, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(v) => formatVNDCompact(Number(v))} />}
                />

                <Bar dataKey="actual" radius={6}>
                  {revenueByBranchBars.data.map((_entry, index) => {
                    const colorKey = `branch-${index}`;
                    const color =
                      (revenueByBranchBars.config as any)[colorKey]?.color ?? `var(--chart-${(index % 5) + 1})`;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                  <LabelList
                    dataKey="actual"
                    position="right"
                    formatter={(v: any) => formatVNDCompact(Number(v))}
                    style={{ fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
