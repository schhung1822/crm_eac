import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { DashboardStats } from "./types";

type MetricCard = {
  label: string;
  value: string;
  current: number;
  previous: number;
};

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function getChange(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ current, previous }: Pick<MetricCard, "current" | "previous">) {
  const change = getChange(current, previous);

  if (change === null) {
    return (
      <Badge variant="outline" className="absolute top-4 right-4 tabular-nums">
        —
      </Badge>
    );
  }

  const isUp = change >= 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        "absolute top-4 right-4 tabular-nums",
        isUp
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      )}
    >
      {isUp ? "+" : ""}
      {change.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
    </Badge>
  );
}

export const SectionCards = memo(function SectionCards({
  stats,
  previousStats,
}: {
  stats: DashboardStats;
  previousStats: DashboardStats;
}) {
  const averageOrderValue = stats.totalOrders > 0 ? stats.totalThanhTien / stats.totalOrders : 0;
  const previousAverageOrderValue =
    previousStats.totalOrders > 0 ? previousStats.totalThanhTien / previousStats.totalOrders : 0;

  const cards: MetricCard[] = [
    {
      label: "Giá trị đơn hàng",
      value: formatCurrency(stats.totalThanhTien),
      current: stats.totalThanhTien,
      previous: previousStats.totalThanhTien,
    },
    {
      label: "Doanh thu hoàn thành",
      value: formatCurrency(stats.completedRevenue),
      current: stats.completedRevenue,
      previous: previousStats.completedRevenue,
    },
    {
      label: "Đơn hàng",
      value: stats.totalOrders.toLocaleString("vi-VN"),
      current: stats.totalOrders,
      previous: previousStats.totalOrders,
    },
    {
      label: "Trung bình / đơn",
      value: formatCurrency(averageOrderValue),
      current: averageOrderValue,
      previous: previousAverageOrderValue,
    },
    {
      label: "Sản phẩm bán ra",
      value: stats.totalQuantity.toLocaleString("vi-VN"),
      current: stats.totalQuantity,
      previous: previousStats.totalQuantity,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="relative gap-0 py-0">
          <CardContent className="px-4 py-4">
            <ChangeBadge current={card.current} previous={card.previous} />
            <p className="text-muted-foreground pr-16 text-xs font-medium">{card.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
