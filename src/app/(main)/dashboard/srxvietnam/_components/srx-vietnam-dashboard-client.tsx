/* eslint-disable max-lines */
"use client";

import type { ReactNode } from "react";

import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  LabelList,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { SrxDashboardData, SrxDashboardGranularity } from "@/lib/srx-dashboard";
import { cn } from "@/lib/utils";

import { DateRangeFilter } from "./date-range-filter";

type DashboardProps = { data: SrxDashboardData };

const performanceChartConfig = {
  revenue: { label: "Doanh thu", color: "#6366f1" },
  orders: { label: "Đơn hàng", color: "#f59e0b" },
} satisfies ChartConfig;

const acquisitionChartConfig = {
  customers: { label: "Khách hàng mới", color: "#10b981" },
  applications: { label: "Hồ sơ affiliate", color: "#0ea5e9" },
} satisfies ChartConfig;

const countChartConfig = {
  count: { label: "Số lượng", color: "#6366f1" },
} satisfies ChartConfig;

const ROW_HEIGHT = 34;

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function formatCompactCurrency(value: number) {
  const numericValue = Number(value) || 0;
  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue >= 1_000_000_000) {
    const scaled = numericValue / 1_000_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} tỷ`;
  }

  if (absoluteValue >= 1_000_000) {
    const scaled = numericValue / 1_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} tr`;
  }

  if (absoluteValue >= 1_000) {
    return `${Math.round(numericValue / 1_000).toLocaleString("vi-VN")}k`;
  }

  return numericValue.toLocaleString("vi-VN");
}

function formatPeriod(value: string, granularity: SrxDashboardGranularity) {
  const parsed = parseISO(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, granularity === "month" ? "MM/yyyy" : "dd/MM");
}

function periodLabel(value: unknown, granularity: SrxDashboardGranularity) {
  return `${granularity === "month" ? "Tháng" : "Ngày"} ${formatPeriod(String(value), granularity)}`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: value >= 10 ? 0 : 1 })}%`;
}

function getOrderStatusTone(status: string) {
  if (status.includes("Chờ")) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status.includes("Hoàn tất")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status.includes("Hủy") || status.includes("Hoàn tiền")) {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

const paymentStatusLabels: Record<string, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thanh toán lỗi",
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm">
      {message}
    </div>
  );
}

function findSeries(config: ChartConfig, name: string) {
  return Object.entries(config).find(([key]) => key === name)?.[1];
}

function Dot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

function TooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground flex items-center gap-2">
        {color ? <Dot color={color} /> : null}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string; hint?: string }> }) {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <Dot color={item.color} />
          {item.label}
          {item.hint ? <span className="opacity-60">({item.hint})</span> : null}
        </span>
      ))}
    </div>
  );
}

function KpiCards({ summary }: Pick<DashboardProps["data"], "summary">) {
  const items = [
    { label: "Doanh thu", value: formatCurrency(summary.totalRevenue) },
    { label: "Đơn hàng", value: summary.totalOrders.toLocaleString("vi-VN") },
    { label: "Giá trị TB / đơn", value: formatCurrency(summary.averageOrderValue) },
    { label: "Khách hàng mới", value: summary.newCustomers.toLocaleString("vi-VN") },
    { label: "Đơn của thành viên", value: formatPercent(summary.registeredOrderRate) },
    { label: "Khách mua lại", value: summary.repeatCustomers.toLocaleString("vi-VN") },
  ];

  return (
    <Card className="py-0">
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="bg-card space-y-1 px-5 py-4">
            <div className="text-muted-foreground text-xs">{item.label}</div>
            <div className="truncate text-xl font-semibold tracking-tight tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OperationsStrip({ operations }: Pick<DashboardProps["data"], "operations">) {
  if (operations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Vận hành hiện tại</h2>
        <span className="text-muted-foreground text-xs">Tại thời điểm xem, không theo bộ lọc ngày</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {operations.map((metric) => {
          const needsAttention = metric.label.includes("chờ") && metric.value > 0;

          return (
            <div
              key={metric.label}
              title={metric.hint}
              className={cn("rounded-lg border px-3 py-2.5", needsAttention && "border-amber-500/40 bg-amber-500/5")}
            >
              <div className="text-muted-foreground truncate text-xs">{metric.label}</div>
              <div className="text-lg font-semibold tabular-nums">{metric.value.toLocaleString("vi-VN")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceCard({
  performance,
  granularity,
}: Pick<DashboardProps["data"], "performance"> & { granularity: SrxDashboardGranularity }) {
  const showDots = performance.length <= 31;

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Doanh thu và đơn hàng</CardTitle>
        <CardDescription>
          Theo {granularity === "month" ? "tháng" : "ngày"}, chỉ tính đơn hoàn tất và đã thanh toán.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <EmptyState message="Chưa có đơn hàng trong khoảng thời gian đã chọn." />
        ) : (
          <ChartContainer config={performanceChartConfig} className="h-[280px] w-full">
            <ComposedChart data={performance} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(value) => formatPeriod(String(value), granularity)}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(value) => periodLabel(value, granularity)}
                    formatter={(value, name) => {
                      const config = findSeries(performanceChartConfig, String(name));
                      const numericValue = Number(value);

                      return (
                        <TooltipRow
                          color={config?.color}
                          label={String(config?.label ?? name)}
                          value={
                            name === "revenue" ? formatCurrency(numericValue) : numericValue.toLocaleString("vi-VN")
                          }
                        />
                      );
                    }}
                  />
                }
              />
              <Bar yAxisId="left" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={2}
                dot={showDots ? { r: 3, fill: "var(--color-orders)" } : false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
        <ChartLegend
          items={[
            { label: performanceChartConfig.revenue.label, color: performanceChartConfig.revenue.color, hint: "cột" },
            { label: performanceChartConfig.orders.label, color: performanceChartConfig.orders.color, hint: "đường" },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function DonutChart({
  data,
  centerLabel,
  tooltipValueLabel,
  valueLabel,
}: {
  data: Array<{ label: string; count: number; revenue: number; fill: string }>;
  centerLabel: string;
  tooltipValueLabel: string;
  valueLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartContainer config={countChartConfig} className="mx-auto h-[190px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              hideIndicator
              formatter={(value, _name, item) => {
                const row = item.payload as { label: string; revenue: number; fill: string };

                return (
                  <div className="w-full space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Dot color={row.fill} />
                      {row.label}
                    </div>
                    <TooltipRow label={tooltipValueLabel} value={Number(value).toLocaleString("vi-VN")} />
                    <TooltipRow label={valueLabel} value={formatCurrency(row.revenue)} />
                  </div>
                );
              }}
            />
          }
        />
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={56}
          outerRadius={84}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((item) => (
            <Cell key={item.label} fill={item.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                return null;
              }

              const centerX = typeof viewBox.cx === "number" ? viewBox.cx : 0;
              const centerY = typeof viewBox.cy === "number" ? viewBox.cy : 0;

              return (
                <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={centerX} y={centerY - 4} className="fill-foreground text-xl font-semibold">
                    {total.toLocaleString("vi-VN")}
                  </tspan>
                  <tspan x={centerX} y={centerY + 14} className="fill-muted-foreground text-xs">
                    {centerLabel}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function OrderStatusCard({ orderStatus }: Pick<DashboardProps["data"], "orderStatus">) {
  const totalOrders = orderStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái đơn hàng</CardTitle>
        <CardDescription>Mọi đơn đặt trong kỳ, kể cả chưa hoàn tất.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderStatus.length === 0 ? (
          <EmptyState message="Chưa có đơn hàng trong khoảng thời gian đã chọn." />
        ) : (
          <>
            <DonutChart data={orderStatus} centerLabel="đơn" tooltipValueLabel="Số đơn" valueLabel="Giá trị đơn" />
            <div className="divide-y text-sm">
              {orderStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2">
                    <Dot color={item.fill} />
                    {item.label}
                    <span className="text-muted-foreground text-xs">
                      {formatPercent(totalOrders > 0 ? (item.count / totalOrders) * 100 : 0)}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-medium">{item.count.toLocaleString("vi-VN")}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{formatCurrency(item.revenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AcquisitionCard({
  performance,
  granularity,
}: Pick<DashboardProps["data"], "performance"> & { granularity: SrxDashboardGranularity }) {
  const showDots = performance.length <= 31;

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Khách hàng mới và hồ sơ affiliate</CardTitle>
        <CardDescription>
          Tài khoản đăng ký và hồ sơ cộng tác viên phát sinh theo {granularity === "month" ? "tháng" : "ngày"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu tăng trưởng để hiển thị." />
        ) : (
          <ChartContainer config={acquisitionChartConfig} className="h-[240px] w-full">
            <ComposedChart data={performance} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(value) => formatPeriod(String(value), granularity)}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(value) => periodLabel(value, granularity)}
                    formatter={(value, name) => {
                      const config = findSeries(acquisitionChartConfig, String(name));

                      return (
                        <TooltipRow
                          color={config?.color}
                          label={String(config?.label ?? name)}
                          value={Number(value).toLocaleString("vi-VN")}
                        />
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="applications" fill="var(--color-applications)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="var(--color-customers)"
                strokeWidth={2}
                dot={showDots ? { r: 3, fill: "var(--color-customers)" } : false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
        <ChartLegend
          items={[
            {
              label: acquisitionChartConfig.customers.label,
              color: acquisitionChartConfig.customers.color,
              hint: "đường",
            },
            {
              label: acquisitionChartConfig.applications.label,
              color: acquisitionChartConfig.applications.color,
              hint: "cột",
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function CustomerMixCard({ customerMix }: Pick<DashboardProps["data"], "customerMix">) {
  const totalOrders = customerMix.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cơ cấu khách mua</CardTitle>
        <CardDescription>Khách lẻ và thành viên, trên đơn hoàn tất đã thanh toán.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customerMix.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu cơ cấu khách mua." />
        ) : (
          <>
            <DonutChart data={customerMix} centerLabel="đơn" tooltipValueLabel="Đơn hàng" valueLabel="Doanh thu" />
            <div className="divide-y text-sm">
              {customerMix.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2">
                    <Dot color={item.fill} />
                    {item.label}
                    <span className="text-muted-foreground text-xs">
                      {formatPercent(totalOrders > 0 ? (item.count / totalOrders) * 100 : 0)}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-medium">{item.count.toLocaleString("vi-VN")}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{formatCurrency(item.revenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryCard({
  title,
  description,
  emptyMessage,
  data,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  data: Array<{ label: string; count: number; fill: string }>;
}) {
  // Chiều cao theo số dòng để nhãn không bị chồng hoặc cắt khi có nhiều danh mục.
  const height = Math.max(120, data.length * ROW_HEIGHT + 16);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <ChartContainer config={countChartConfig} className="w-full" style={{ height }}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}…` : value)}
              />
              <XAxis type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel hideIndicator nameKey="label" />} />
              <Bar dataKey="count" radius={4} maxBarSize={18}>
                {data.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 12 }} className="fill-foreground" />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ListRow({ children }: { children: ReactNode }) {
  return <div className="py-3 first:pt-0 last:pb-0">{children}</div>;
}

function TopProductsCard({ topProducts }: Pick<DashboardProps["data"], "topProducts">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sản phẩm bán chạy</CardTitle>
        <CardDescription>Top 5 theo số lượng đã bán, toàn bộ thời gian.</CardDescription>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu sản phẩm." />
        ) : (
          <div className="divide-y">
            {topProducts.map((product, index) => (
              <ListRow key={product.name}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-2.5">
                    <span className="text-muted-foreground w-4 shrink-0 text-xs tabular-nums">{index + 1}</span>
                    <span className="line-clamp-2 text-sm">{product.name}</span>
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    <div className="font-medium">{product.soldCount.toLocaleString("vi-VN")}</div>
                    <div className="text-muted-foreground text-xs">{formatCurrency(product.price)}</div>
                  </div>
                </div>
                <div className="bg-muted mt-2 ml-6 h-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.min(product.share, 100)}%` }}
                  />
                </div>
              </ListRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LatestOrdersCard({ latestOrders }: Pick<DashboardProps["data"], "latestOrders">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng mới nhất</CardTitle>
        <CardDescription>5 đơn gần nhất trong kỳ, mọi trạng thái.</CardDescription>
      </CardHeader>
      <CardContent>
        {latestOrders.length === 0 ? (
          <EmptyState message="Chưa có đơn hàng trong khoảng thời gian đã chọn." />
        ) : (
          <div className="divide-y">
            {latestOrders.map((order) => (
              <ListRow key={order.orderNumber}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{order.orderNumber}</div>
                    <div className="text-muted-foreground truncate text-xs">{order.customerName}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-medium tabular-nums">{formatCurrency(order.total)}</div>
                    <div className="text-muted-foreground text-xs">{order.placedAt}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", getOrderStatusTone(order.orderStatus))}>
                    {order.orderStatus}
                  </span>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </div>
              </ListRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentPostsCard({ recentPosts }: Pick<DashboardProps["data"], "recentPosts">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bài viết mới nhất</CardTitle>
        <CardDescription>5 bài xuất bản gần nhất trong kỳ.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentPosts.length === 0 ? (
          <EmptyState message="Chưa có bài viết trong khoảng thời gian đã chọn." />
        ) : (
          <div className="divide-y">
            {recentPosts.map((post) => (
              <ListRow key={`${post.title}-${post.publishedAt}`}>
                <div className="line-clamp-2 text-sm">{post.title}</div>
                <div className="text-muted-foreground mt-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="bg-muted rounded-full px-2 py-0.5">{post.categoryName}</span>
                  <span>{post.publishedAt}</span>
                </div>
              </ListRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SrxVietnamDashboardClient({ data }: DashboardProps) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Báo cáo website SRX Việt Nam</h1>
          <p className="text-muted-foreground text-sm">
            Doanh thu và đơn hàng chỉ tính đơn đã hoàn tất và đã thanh toán.
          </p>
        </div>
        <DateRangeFilter />
      </header>

      {data.unavailable ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Không đọc được dữ liệu website SRX</AlertTitle>
          <AlertDescription>
            Cơ sở dữ liệu SRX đang thiếu bảng hoặc cột cần thiết, nên các số 0 bên dưới chưa phản ánh thực tế. Hãy kiểm
            tra lại cấu trúc cơ sở dữ liệu.
          </AlertDescription>
        </Alert>
      ) : null}

      <KpiCards summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PerformanceCard performance={data.performance} granularity={data.performanceGranularity} />
        <OrderStatusCard orderStatus={data.orderStatus} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AcquisitionCard performance={data.performance} granularity={data.performanceGranularity} />
        <CustomerMixCard customerMix={data.customerMix} />
      </div>

      <OperationsStrip operations={data.operations} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CategoryCard
          title="Hồ sơ affiliate"
          description="Theo trạng thái duyệt, trong kỳ."
          emptyMessage="Chưa có hồ sơ affiliate trong khoảng thời gian đã chọn."
          data={data.affiliateStatus}
        />
        <CategoryCard
          title="Sản phẩm theo danh mục"
          description="Sản phẩm đang bán, toàn bộ thời gian."
          emptyMessage="Chưa có sản phẩm đang bán."
          data={data.productCategories}
        />
        <CategoryCard
          title="Bài viết theo danh mục"
          description="Bài đã xuất bản, trong kỳ."
          emptyMessage="Chưa có bài viết trong khoảng thời gian đã chọn."
          data={data.contentCategories}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TopProductsCard topProducts={data.topProducts} />
        <LatestOrdersCard latestOrders={data.latestOrders} />
        <RecentPostsCard recentPosts={data.recentPosts} />
      </div>
    </div>
  );
}
