/* eslint-disable max-lines */
"use client";

import { Building2, Clock3, Crown, UserRoundCheck, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="text-muted-foreground flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
      {message}
    </div>
  );
}

function SummaryCards({ summary }: Pick<CustomerInsightCardsProps, "summary">) {
  const cards = [
    {
      title: "Tổng khách hàng",
      value: formatNumber(summary.totalCustomers),
      description: "Toàn bộ hồ sơ đang có trong bảng customer",
      icon: Users,
    },
    {
      title: "Khách hoạt động 30 ngày",
      value: formatNumber(summary.activeCustomers),
      description: "Có giao dịch trong vòng 30 ngày gần nhất",
      icon: UserRoundCheck,
    },
    {
      title: "Khách công ty",
      value: formatNumber(summary.companyCustomers),
      description: "Khách có thông tin công ty/doanh nghiệp",
      icon: Building2,
    },
    {
      title: "Khách ngủ đông",
      value: formatNumber(summary.dormantCustomers),
      description: "Chưa giao dịch hoặc cách lần mua gần nhất hơn 120 ngày",
      icon: Clock3,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="gap-3">
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
              <card.icon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight">{card.value}</CardTitle>
              <p className="text-muted-foreground text-sm">{card.description}</p>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function DistributionCard({
  title,
  description,
  data,
  centerLabel,
}: {
  title: string;
  description: string;
  data: CustomerDistributionDatum[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <EmptyState message="Chưa có đủ dữ liệu khách hàng để dựng biểu đồ." />
        ) : (
          <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
            <ChartContainer config={distributionChartConfig} className="h-[260px] w-full max-w-[260px]">
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
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={64} outerRadius={96} paddingAngle={3}>
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

            <div className="w-full space-y-2">
              {data.map((item) => {
                const ratio = total > 0 ? (item.value / total) * 100 : 0;

                return (
                  <div key={item.label} className="rounded-xl border px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="size-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="truncate text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatNumber(item.value)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tỷ trọng</span>
                      <span>{ratio.toFixed(1)}%</span>
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
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Khách hàng mới theo thời gian</CardTitle>
        <CardDescription>Nhìn nhịp tăng trưởng customer base trong CRM EAC theo tháng.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu tạo mới khách hàng trong khoảng thời gian này." />
        ) : (
          <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
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
    <Card>
      <CardHeader>
        <CardTitle>Top khách VIP</CardTitle>
        <CardDescription>Xếp theo `tong_ban_tru_tra_hang` để nhìn nhanh nhóm khách giá trị cao.</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu khách VIP." />
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {customers.map((customer, index) => (
                <div
                  key={`${customer.name}-${customer.branch}-${customer.lastPayment}`}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-bold">
                          {index + 1}
                        </span>
                        {index < 3 ? <Crown className="size-4 text-amber-500" /> : null}
                      </div>
                      <div className="truncate text-sm font-semibold">{customer.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {customer.company} · {customer.branch}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCompactCurrency(customer.totalRevenue)}</div>
                      <div className="text-muted-foreground text-xs">Gần nhất: {customer.lastPayment}</div>
                    </div>
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
        <DistributionCard
          title="Khách hàng theo chi nhánh"
          description="Phân bố hồ sơ khách hàng hiện có giữa các chi nhánh/đơn vị."
          data={branchDistribution}
          centerLabel="chi nhánh"
        />
        <DistributionCard
          title="Phân hạng khách hàng"
          description="Tỷ trọng các nhóm class đang có trong CRM."
          data={classDistribution}
          centerLabel="phân hạng"
        />
        <DistributionCard
          title="Số ngày chưa giao dịch"
          description="Theo dõi mức độ hoạt động và nhóm khách cần re-activate."
          data={recencyDistribution}
          centerLabel="recency"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CreatedTrendCard data={createdTrend} />
        <TopVipCard customers={topCustomers} />
      </div>
    </div>
  );
}
