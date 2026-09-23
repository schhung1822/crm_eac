/* eslint-disable max-lines */
"use client";

import { Area, AreaChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";

type CustomerDistributionDatum = {
  label: string;
  value: number;
  fill: string;
};

type CustomerTrendPoint = {
  period: string;
  customers: number;
};

type TopCustomer = {
  name: string;
  branch: string;
  company: string;
  totalRevenue: number;
  lastPayment: string;
};

type CustomerInsightCardsProps = {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    companyCustomers: number;
    dormantCustomers: number;
  };
  branchDistribution: CustomerDistributionDatum[];
  classDistribution: CustomerDistributionDatum[];
  recencyDistribution: CustomerDistributionDatum[];
  createdTrend: CustomerTrendPoint[];
  topCustomers: TopCustomer[];
};

const distributionChartConfig = {
  value: {
    label: "Khách hàng",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  customers: {
    label: "Khách mới",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

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

  return value.toLocaleString("vi-VN");
}

function formatMonthLabel(period: string) {
  const [year, month] = period.split("-");
  if (!year || !month) {
    return period;
  }

  return `${month}/${year.slice(-2)}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-full min-h-56 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm">
      {message}
    </div>
  );
}

function SummaryCards({ summary }: Pick<CustomerInsightCardsProps, "summary">) {
  const cards = [
    {
      title: "Tổng khách hàng",
      value: formatNumber(summary.totalCustomers),
    },
    {
      title: "Khách hoạt động 30 ngày",
      value: formatNumber(summary.activeCustomers),
    },
    {
      title: "Khách công ty",
      value: formatNumber(summary.companyCustomers),
    },
    {
      title: "Khách ngủ đông",
      value: formatNumber(summary.dormantCustomers),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs font-medium">{card.title}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DistributionCard({
  title,
  data,
  centerLabel,
}: {
  title: string;
  data: CustomerDistributionDatum[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="gap-3">
      <CardHeader className="px-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {data.length === 0 ? (
          <EmptyState message="Chưa có đủ dữ liệu khách hàng để dựng biểu đồ." />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={distributionChartConfig} className="h-[220px] w-full max-w-[240px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as CustomerDistributionDatum;
                        const ratio = total > 0 ? (row.value / total) * 100 : 0;

                        return (
                          <div className="space-y-1">
                            <div className="font-medium">{row.label}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Số lượng</span>
                              <span>{formatNumber(Number(value))}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Tỷ trọng</span>
                              <span>{ratio.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={3}>
                  {data.map((item) => (
                    <Cell key={item.label} fill={item.fill} />
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
                            {formatNumber(total)}
                          </tspan>
                          <tspan x={viewBox.cx} y={centerY + 18} className="fill-muted-foreground text-xs">
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="w-full divide-y">
              {data.map((item) => {
                const ratio = total > 0 ? (item.value / total) * 100 : 0;

                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="truncate text-sm">{item.label}</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2 text-right">
                      <span className="text-sm font-medium tabular-nums">{formatNumber(item.value)}</span>
                      <span className="text-muted-foreground w-12 text-xs tabular-nums">{ratio.toFixed(1)}%</span>
                    </div>
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

function CreatedTrendCard({ data }: { data: CustomerTrendPoint[] }) {
  return (
    <Card className="gap-3 xl:col-span-2">
      <CardHeader className="px-4">
        <CardTitle>Khách hàng mới theo thời gian</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {data.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu tạo mới khách hàng trong khoảng thời gian này." />
        ) : (
          <ChartContainer config={trendChartConfig} className="h-[260px] w-full">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="customerTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-customers)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-customers)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={formatMonthLabel}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Tháng ${formatMonthLabel(String(value))}`}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">Khách mới</span>
                        <span className="font-medium">{formatNumber(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="customers"
                stroke="var(--color-customers)"
                strokeWidth={3}
                fill="url(#customerTrendFill)"
                dot={{ r: 4, fill: "var(--color-customers)" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopVipCard({ customers }: { customers: TopCustomer[] }) {
  return (
    <Card className="gap-3">
      <CardHeader className="px-4">
        <CardTitle>Top khách VIP</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {customers.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu khách VIP." />
        ) : (
          <ScrollArea className="h-[260px] pr-3">
            <div className="divide-y">
              {customers.map((customer, index) => (
                <div
                  key={`${customer.name}-${customer.branch}-${customer.lastPayment}`}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0"
                >
                  <span className="text-muted-foreground w-5 shrink-0 text-xs font-medium tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{customer.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {customer.company} · {customer.branch}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{formatCompactCurrency(customer.totalRevenue)}</div>
                    <div className="text-muted-foreground text-xs">{customer.lastPayment}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerInsightCards({
  summary,
  branchDistribution,
  classDistribution,
  recencyDistribution,
  createdTrend,
  topCustomers,
}: CustomerInsightCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DistributionCard title="Khách hàng theo chi nhánh" data={branchDistribution} centerLabel="Khách hàng" />
        <DistributionCard title="Phân hạng khách hàng" data={classDistribution} centerLabel="Khách hàng" />
        <DistributionCard title="Số ngày chưa giao dịch" data={recencyDistribution} centerLabel="Khách hàng" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CreatedTrendCard data={createdTrend} />
        <TopVipCard customers={topCustomers} />
      </div>
    </div>
  );
}
