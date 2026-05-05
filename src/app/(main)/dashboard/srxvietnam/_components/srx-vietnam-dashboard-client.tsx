/* eslint-disable max-lines */
"use client";

import { format, parseISO } from "date-fns";
import { BadgePercent, ShoppingCart, UserPlus, Wallet } from "lucide-react";
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

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { DateRangeFilter } from "./date-range-filter";

type SrxVietnamDashboardClientProps = {
  data: {
    summary: {
      totalRevenue: number;
      totalOrders: number;
      newCustomers: number;
      averageOrderValue: number;
      registeredOrderRate: number;
      repeatCustomers: number;
    };
    operations: Array<{
      label: string;
      value: number;
      hint: string;
    }>;
    performance: Array<{
      date: string;
      revenue: number;
      orders: number;
      customers: number;
      applications: number;
    }>;
    orderStatus: Array<{
      label: string;
      count: number;
      revenue: number;
      fill: string;
    }>;
    customerMix: Array<{
      label: string;
      count: number;
      revenue: number;
      fill: string;
    }>;
    productCategories: Array<{
      label: string;
      count: number;
      fill: string;
    }>;
    contentCategories: Array<{
      label: string;
      count: number;
      fill: string;
    }>;
    affiliateStatus: Array<{
      label: string;
      count: number;
      fill: string;
    }>;
    topProducts: Array<{
      name: string;
      soldCount: number;
      price: number;
      share: number;
    }>;
    latestOrders: Array<{
      orderNumber: string;
      customerName: string;
      orderStatus: string;
      paymentStatus: string;
      total: number;
      placedAt: string;
    }>;
    recentPosts: Array<{
      title: string;
      categoryName: string;
      publishedAt: string;
    }>;
  };
};

const performanceChartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "var(--chart-1)",
  },
  orders: {
    label: "Đơn hàng",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const acquisitionChartConfig = {
  customers: {
    label: "Khách hàng mới",
    color: "var(--chart-3)",
  },
  applications: {
    label: "Hồ sơ affiliate",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const countChartConfig = {
  count: {
    label: "Số lượng",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const mixChartConfig = {
  count: {
    label: "Đơn hàng",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function getChartLabel(config: ChartConfig, key: string) {
  const entry = Object.entries(config).find(([configKey]) => configKey === key);
  return entry ? (entry[1].label ?? key) : key;
}

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
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} triệu`;
  }

  return `${numericValue.toLocaleString("vi-VN")}đ`;
}

function formatShortDate(value: string) {
  const parsed = parseISO(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "dd/MM");
}

function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: value >= 10 ? 0 : 1 })}%`;
}

function getOrderStatusTone(status: string) {
  if (status.includes("Chờ")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status.includes("Hoàn tất") || status.includes("Đã xác nhận")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status.includes("Hủy") || status.includes("Hoàn tiền")) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function getPaymentStatusLabel(status: string) {
  if (status === "pending") {
    return "Thanh toán chờ";
  }

  if (status === "paid") {
    return "Đã thanh toán";
  }

  if (status === "refunded") {
    return "Đã hoàn tiền";
  }

  if (status === "failed") {
    return "Thanh toán lỗi";
  }

  return status;
}

function EmptyCardState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed text-sm">
      {message}
    </div>
  );
}

function KpiCards({ summary }: Pick<SrxVietnamDashboardClientProps["data"], "summary">) {
  const cards = [
    {
      title: "Doanh thu",
      value: formatCurrency(summary.totalRevenue),
      description: "Tổng doanh thu đơn hàng trong phạm vi lọc",
      icon: Wallet,
    },
    {
      title: "Đơn hàng",
      value: summary.totalOrders.toLocaleString("vi-VN"),
      description: "Số đơn phát sinh từ website SRX",
      icon: ShoppingCart,
    },
    {
      title: "Khách hàng mới",
      value: summary.newCustomers.toLocaleString("vi-VN"),
      description: "Tài khoản mới đăng ký trong kỳ",
      icon: UserPlus,
    },
    {
      title: "AOV",
      value: formatCurrency(summary.averageOrderValue),
      description: "Giá trị trung bình trên mỗi đơn",
      icon: BadgePercent,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
                <card.icon className="size-5" />
              </div>
              <Badge variant="outline">{card.title}</Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold tracking-tight">{card.value}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function OperationalMetrics({
  operations,
  summary,
}: Pick<SrxVietnamDashboardClientProps["data"], "operations" | "summary">) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      <Card className="border-dashed">
        <CardHeader className="gap-2">
          <CardDescription>Tỷ lệ đơn từ tài khoản đã đăng nhập</CardDescription>
          <CardTitle className="text-xl">{formatPercent(summary.registeredOrderRate)}</CardTitle>
          <p className="text-muted-foreground text-sm">Đo mức độ chuyển đổi từ khách lẻ sang khách có tài khoản.</p>
        </CardHeader>
      </Card>
      <Card className="border-dashed">
        <CardHeader className="gap-2">
          <CardDescription>Khách hàng thân thiết</CardDescription>
          <CardTitle className="text-xl">{summary.repeatCustomers.toLocaleString("vi-VN")}</CardTitle>
          <p className="text-muted-foreground text-sm">Số khách quay lại mua trên 1 lần.</p>
        </CardHeader>
      </Card>
      {operations.map((metric) => (
        <Card key={metric.label} className="border-dashed">
          <CardHeader className="gap-2">
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="text-xl">{metric.value.toLocaleString("vi-VN")}</CardTitle>
            <p className="text-muted-foreground text-sm">{metric.hint}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function PerformanceCard({ performance }: Pick<SrxVietnamDashboardClientProps["data"], "performance">) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Nhịp doanh thu và đơn hàng</CardTitle>
        <CardDescription>Đọc nhanh xu hướng phát sinh doanh thu và số đơn theo ngày.</CardDescription>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <EmptyCardState message="Chưa có dữ liệu đơn hàng trong khoảng thời gian đã chọn." />
        ) : (
          <ChartContainer config={performanceChartConfig} className="h-[320px] w-full">
            <ComposedChart data={performance} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={32} tickFormatter={formatShortDate} />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                width={88}
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
              />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Ngày ${formatShortDate(String(value))}`}
                    formatter={(value, name) => {
                      const numericValue = Number(value);
                      const label = getChartLabel(performanceChartConfig, String(name));

                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">
                            {name === "revenue" ? formatCurrency(numericValue) : numericValue.toLocaleString("vi-VN")}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar yAxisId="left" dataKey="revenue" fill="var(--color-revenue)" radius={[10, 10, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-orders)" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function OrderStatusCard({ orderStatus }: Pick<SrxVietnamDashboardClientProps["data"], "orderStatus">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái đơn hàng</CardTitle>
        <CardDescription>Nhóm backlog đơn để ưu tiên xử lý vận hành.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderStatus.length === 0 ? (
          <EmptyCardState message="Chưa có dữ liệu trạng thái đơn hàng." />
        ) : (
          <>
            <ChartContainer config={countChartConfig} className="h-[320px] w-full">
              <BarChart
                data={orderStatus}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                barCategoryGap={18}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={108}
                  tick={{ fontSize: 11 }}
                />
                <XAxis type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as { label: string; revenue: number };

                        return (
                          <div className="space-y-1">
                            <div className="font-medium">{row.label}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Số đơn</span>
                              <span>{Number(value).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Doanh thu</span>
                              <span>{formatCurrency(row.revenue)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="count" radius={8}>
                  {orderStatus.map((item) => (
                    <Cell key={item.label} fill={item.fill} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="grid gap-2">
              {orderStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AcquisitionCard({ performance }: Pick<SrxVietnamDashboardClientProps["data"], "performance">) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Tăng trưởng khách hàng và affiliate</CardTitle>
        <CardDescription>So sánh user mới với số hồ sơ affiliate phát sinh theo ngày.</CardDescription>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <EmptyCardState message="Chưa có dữ liệu tăng trưởng để hiển thị." />
        ) : (
          <ChartContainer config={acquisitionChartConfig} className="h-[300px] w-full">
            <ComposedChart data={performance} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={32} tickFormatter={formatShortDate} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Ngày ${formatShortDate(String(value))}`}
                    formatter={(value, name) => {
                      const label = getChartLabel(acquisitionChartConfig, String(name));
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{Number(value).toLocaleString("vi-VN")}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="applications" fill="var(--color-applications)" radius={[10, 10, 0, 0]} />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="var(--color-customers)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-customers)" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerMixCard({ customerMix }: Pick<SrxVietnamDashboardClientProps["data"], "customerMix">) {
  const totalOrders = customerMix.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cơ cấu khách mua</CardTitle>
        <CardDescription>Phân biệt đơn từ khách lẻ và khách đã có tài khoản.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customerMix.length === 0 ? (
          <EmptyCardState message="Chưa có dữ liệu cơ cấu khách mua." />
        ) : (
          <>
            <ChartContainer config={mixChartConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const row = item.payload as { label: string; revenue: number };
                        return (
                          <div className="space-y-1">
                            <div className="font-medium">{row.label}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span>{Number(value).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Doanh thu</span>
                              <span>{formatCurrency(row.revenue)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={customerMix}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {customerMix.map((item) => (
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
            <div className="space-y-2">
              {customerMix.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div>{item.count.toLocaleString("vi-VN")} đơn</div>
                    <div className="text-muted-foreground">{formatCurrency(item.revenue)}</div>
                  </div>
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
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; count: number; fill: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyCardState message="Không có đủ dữ liệu để dựng biểu đồ." />
        ) : (
          <ChartContainer config={countChartConfig} className="h-[300px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={108}
                tick={{ fontSize: 11 }}
              />
              <XAxis type="number" hide />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={8}>
                {data.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function AffiliateStatusCard({ affiliateStatus }: Pick<SrxVietnamDashboardClientProps["data"], "affiliateStatus">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái hồ sơ affiliate</CardTitle>
        <CardDescription>Theo dõi pipeline duyệt cộng tác viên từ website.</CardDescription>
      </CardHeader>
      <CardContent>
        {affiliateStatus.length === 0 ? (
          <EmptyCardState message="Chưa có hồ sơ affiliate trong khoảng thời gian đã chọn." />
        ) : (
          <ChartContainer config={countChartConfig} className="h-[300px] w-full">
            <BarChart data={affiliateStatus} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {affiliateStatus.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopProductsCard({ topProducts }: Pick<SrxVietnamDashboardClientProps["data"], "topProducts">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top sản phẩm bán tốt</CardTitle>
        <CardDescription>Lấy theo `sold_count` của catalog SRX để nhìn nhanh nhóm SKU chủ lực.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {topProducts.length === 0 ? (
          <EmptyCardState message="Chưa có dữ liệu sản phẩm." />
        ) : (
          topProducts.map((product, index) => (
            <div key={product.name} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-muted-foreground text-xs font-medium">#{index + 1}</div>
                  <div className="line-clamp-2 text-sm font-medium">{product.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{product.soldCount.toLocaleString("vi-VN")}</div>
                  <div className="text-muted-foreground text-xs">đã bán</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.min(product.share, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatPercent(product.share)} trong top 5</span>
                  <span>{formatCurrency(product.price)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LatestOrdersCard({ latestOrders }: Pick<SrxVietnamDashboardClientProps["data"], "latestOrders">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đơn hàng mới nhất</CardTitle>
        <CardDescription>Giúp đội vận hành bám sát các đơn vừa phát sinh từ website.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestOrders.length === 0 ? (
          <EmptyCardState message="Chưa có đơn hàng trong khoảng thời gian đã chọn." />
        ) : (
          latestOrders.map((order) => (
            <div key={order.orderNumber} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{order.orderNumber}</div>
                  <div className="text-muted-foreground text-sm">{order.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(order.total)}</div>
                  <div className="text-muted-foreground text-xs">{order.placedAt}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    getOrderStatusTone(order.orderStatus),
                  )}
                >
                  {order.orderStatus}
                </span>
                <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
                  {getPaymentStatusLabel(order.paymentStatus)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentPostsCard({ recentPosts }: Pick<SrxVietnamDashboardClientProps["data"], "recentPosts">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bài viết mới nhất</CardTitle>
        <CardDescription>Kiểm tra nhịp xuất bản và cơ cấu nội dung của website SRX.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentPosts.length === 0 ? (
          <EmptyCardState message="Chưa có bài viết trong khoảng thời gian đã chọn." />
        ) : (
          recentPosts.map((post) => (
            <div key={`${post.title}-${post.publishedAt}`} className="rounded-2xl border p-4">
              <div className="line-clamp-2 text-sm font-medium">{post.title}</div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="bg-primary/10 text-primary inline-flex rounded-full px-2.5 py-1 font-medium">
                  {post.categoryName}
                </span>
                <span className="text-muted-foreground">{post.publishedAt}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function SrxVietnamDashboardClient({ data }: SrxVietnamDashboardClientProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-sm">
        <CardHeader className="gap-4 lg:flex lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-white/15 bg-white/10 text-white hover:bg-white/10">Dashboard SRX</Badge>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-semibold tracking-tight">
                Báo cáo vận hành website SRX Việt Nam
              </CardTitle>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-1">
            <DateRangeFilter />
          </div>
        </CardHeader>
      </Card>

      <KpiCards summary={data.summary} />
      <OperationalMetrics operations={data.operations} summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PerformanceCard performance={data.performance} />
        <OrderStatusCard orderStatus={data.orderStatus} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <AcquisitionCard performance={data.performance} />
        <CustomerMixCard customerMix={data.customerMix} />
        <AffiliateStatusCard affiliateStatus={data.affiliateStatus} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CategoryCard
          title="Cơ cấu danh mục sản phẩm"
          description="Cho biết catalog active đang tập trung ở nhóm điều trị nào."
          data={data.productCategories}
        />
        <CategoryCard
          title="Cơ cấu danh mục bài viết"
          description="Theo dõi trọng tâm nội dung đang xuất bản trên website."
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
