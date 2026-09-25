"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

import { formatCurrency, formatNumber, formatPercent } from "./crm-format";
import { EmptyState, ReportCard } from "./report-card";
import { getStatusColor } from "./report-colors";

type OrderStatusItem = { status: string; orders: number; revenue: number };

const chartConfig = { orders: { label: "Đơn hàng" } } satisfies ChartConfig;

/** Cơ cấu trạng thái đơn hàng — cùng dạng với thẻ "Cơ cấu trạng thái" ở trang Tổng quan. */
export function OrderStatusCard({ statuses }: { statuses: OrderStatusItem[] }) {
  const totalOrders = statuses.reduce((sum, item) => sum + item.orders, 0);
  const chartData = statuses.map((item) => ({ ...item, fill: getStatusColor(item.status) }));

  return (
    <ReportCard title="Cơ cấu trạng thái" description="Theo số đơn trong kỳ" className="h-full">
      {chartData.length === 0 ? (
        <EmptyState>Chưa có dữ liệu trạng thái đơn hàng.</EmptyState>
      ) : (
        <div className="@container/status">
          <div className="flex flex-col gap-5 @lg/status:flex-row @lg/status:items-center @lg/status:gap-8">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px] shrink-0">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as OrderStatusItem;

                        return (
                          <div className="min-w-40 space-y-1">
                            <div className="font-medium">{row.status}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span className="tabular-nums">
                                {formatNumber(Number(value))} · {formatPercent(Number(value), totalOrders)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Thành tiền</span>
                              <span className="tabular-nums">{formatCurrency(row.revenue)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="orders"
                  nameKey="status"
                  innerRadius={58}
                  outerRadius={84}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {chartData.map((item) => (
                    <Cell key={item.status} fill={item.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                        return null;
                      }

                      const centerY = typeof viewBox.cy === "number" ? viewBox.cy : 0;

                      return (
                        <text x={viewBox.cx} y={centerY} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={centerY - 4} className="fill-foreground text-2xl font-semibold">
                            {formatNumber(totalOrders)}
                          </tspan>
                          <tspan x={viewBox.cx} y={centerY + 18} className="fill-muted-foreground text-xs">
                            tổng đơn
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <ul className="min-w-0 flex-1 divide-y">
              {chartData.map((item) => (
                <li
                  key={item.status}
                  className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                  title={`${item.status} · Thành tiền: ${formatCurrency(item.revenue)}`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="min-w-0 flex-1 truncate">{item.status}</span>
                  <span className="font-medium tabular-nums">{formatNumber(item.orders)}</span>
                  <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                    {formatPercent(item.orders, totalOrders)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </ReportCard>
  );
}
