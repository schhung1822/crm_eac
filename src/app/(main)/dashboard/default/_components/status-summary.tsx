"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { OrderStatusSummary } from "./types";

const chartConfig = {
  orders: {
    label: "Đơn hàng",
  },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function getStatusColor(status: string) {
  const normalized = status.toLocaleLowerCase("vi-VN");

  if (normalized.includes("hoàn thành")) {
    return "#10b981";
  }

  if (normalized.includes("đang xử lý") || normalized.includes("xác nhận")) {
    return "#f59e0b";
  }

  if (normalized.includes("hủy") || normalized.includes("không giao")) {
    return "#f43f5e";
  }

  return "#64748b";
}

export function StatusSummary({ data }: { data: OrderStatusSummary[] }) {
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const chartData = data.map((item) => ({ ...item, fill: getStatusColor(item.status) }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Cơ cấu trạng thái</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[300px] items-center justify-center rounded-xl border border-dashed text-sm">
            Chưa có dữ liệu trạng thái đơn hàng.
          </div>
        ) : (
          <div className="space-y-4">
            <ChartContainer config={chartConfig} className="mx-auto h-[220px] w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as OrderStatusSummary;

                        return (
                          <div className="space-y-1">
                            <div className="font-medium">{row.status}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span>{Number(value).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Thành tiền</span>
                              <span>{formatCurrency(row.revenue)}</span>
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
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
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
                          <tspan x={viewBox.cx} y={centerY} className="fill-foreground text-2xl font-semibold">
                            {totalOrders.toLocaleString("vi-VN")}
                          </tspan>
                          <tspan x={viewBox.cx} y={centerY + 20} className="fill-muted-foreground text-xs">
                            tổng đơn
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {chartData.map((item) => {
                const share = totalOrders > 0 ? (item.orders / totalOrders) * 100 : 0;

                return (
                  <div
                    key={item.status}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="truncate text-sm font-medium">{item.status}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {item.orders.toLocaleString("vi-VN")}
                      {" · "}
                      {share.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
