"use client";

import { useMemo, useState } from "react";

import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RevenueTrend } from "@/lib/crm-revenue-insights";

import { formatAxisCurrency, formatCompactCurrency, formatCurrency, formatNumber } from "./crm-format";
import { FullValue } from "./full-value";
import { EmptyState, ReportCard } from "./report-card";
import { buildChannelColors, OTHER_COLOR, PRIMARY_SERIES_COLOR } from "./report-colors";

type Metric = "revenue" | "orders";

/** Số kênh vẽ riêng tối đa; phần còn lại gộp vào "Khác". */
const MAX_CHANNEL_LINES = 4;

function formatTick(period: string, granularity: RevenueTrend["granularity"]) {
  const [year, month, day] = period.split("-");
  return granularity === "day" ? `${day}/${month}` : `${month}/${year.slice(2)}`;
}

function formatTooltipLabel(period: string, granularity: RevenueTrend["granularity"]) {
  const [year, month, day] = period.split("-");
  return granularity === "day" ? `Ngày ${day}/${month}/${year}` : `Tháng ${month}/${year}`;
}

function formatMetric(value: number, metric: Metric) {
  return metric === "revenue" ? formatCurrency(value) : `${formatNumber(value)} đơn`;
}

function formatAxis(value: number, metric: Metric) {
  return metric === "revenue" ? formatAxisCurrency(value) : formatNumber(value);
}

type Series = { key: string; label: string; color: string; total: number };

function buildSeries(trend: RevenueTrend, metric: Metric, splitByChannel: boolean) {
  if (!splitByChannel) {
    const total = trend.points.reduce((sum, point) => sum + point[metric], 0);
    const series: Series[] = [
      { key: "total", label: metric === "revenue" ? "Doanh thu" : "Đơn hàng", color: PRIMARY_SERIES_COLOR, total },
    ];
    const rows = trend.points.map((point) => ({ period: point.period, total: point[metric] }));
    return { series, rows };
  }

  const pick = (point: RevenueTrend["points"][number]) =>
    metric === "revenue" ? point.byChannel : point.ordersByChannel;
  const visible = trend.channels.slice(0, MAX_CHANNEL_LINES);
  const hasOther = trend.channels.length > MAX_CHANNEL_LINES;
  const colors = buildChannelColors(trend.channels);

  const rows = trend.points.map((point) => {
    const values = pick(point);
    const row: Record<string, number | string> = { period: point.period };
    let visibleTotal = 0;

    visible.forEach((channel, index) => {
      const value = values[channel] ?? 0;
      row[`s${index}`] = value;
      visibleTotal += value;
    });

    if (hasOther) {
      row.other = point[metric] - visibleTotal;
    }

    return row;
  });

  const sumOf = (key: string) => rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  const series: Series[] = [
    ...visible.map((channel, index) => ({
      key: `s${index}`,
      label: channel,
      color: colors.get(channel) ?? OTHER_COLOR,
      total: sumOf(`s${index}`),
    })),
    ...(hasOther ? [{ key: "other", label: "Khác", color: OTHER_COLOR, total: sumOf("other") }] : []),
  ];

  return { series, rows };
}

/**
 * Xu hướng theo ngày/tháng. Một chỉ số tại một thời điểm (không dùng 2 trục Y).
 * `splitByChannel`: mỗi kênh một đường, màu cố định theo kênh.
 */
export function RevenueTrendCard({
  trend,
  title,
  splitByChannel = false,
}: {
  trend: RevenueTrend;
  title: string;
  splitByChannel?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const { series, rows } = useMemo(() => buildSeries(trend, metric, splitByChannel), [trend, metric, splitByChannel]);
  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color }])),
    [series],
  );
  const grandTotal = series.reduce((sum, item) => sum + item.total, 0);
  const hasData = trend.points.some((point) => point.orders > 0 || point.revenue !== 0);

  const xAxis = (
    <XAxis
      dataKey="period"
      tickLine={false}
      axisLine={false}
      tickMargin={10}
      minTickGap={28}
      tickFormatter={(value) => formatTick(String(value), trend.granularity)}
    />
  );
  const yAxis = (
    <YAxis
      tickLine={false}
      axisLine={false}
      width={56}
      allowDecimals={false}
      tickFormatter={(value) => formatAxis(Number(value), metric)}
    />
  );
  const tooltip = (
    <ChartTooltip
      cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) =>
            formatTooltipLabel(String(payload[0]?.payload?.period ?? ""), trend.granularity)
          }
          formatter={(value, name, item) => (
            <div className="flex w-full items-center justify-between gap-6">
              <span className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="text-muted-foreground">{config[String(name)]?.label ?? name}</span>
              </span>
              <span className="font-medium tabular-nums">{formatMetric(Number(value), metric)}</span>
            </div>
          )}
        />
      }
    />
  );
  const activeDot = { r: 4, strokeWidth: 2, stroke: "var(--card)" };

  return (
    <ReportCard
      title={title}
      className="h-full"
      description={
        <span>
          {trend.granularity === "day" ? "Theo ngày" : "Theo tháng"} · Tổng kỳ{" "}
          <span className="text-foreground font-medium">
            {metric === "revenue" ? (
              <FullValue fullValue={formatCurrency(grandTotal)}>{formatCompactCurrency(grandTotal)}</FullValue>
            ) : (
              `${formatNumber(grandTotal)} đơn`
            )}
          </span>
        </span>
      }
      action={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={metric}
          onValueChange={(value) => value && setMetric(value as Metric)}
        >
          <ToggleGroupItem value="revenue" className="px-3 text-xs">
            Doanh thu
          </ToggleGroupItem>
          <ToggleGroupItem value="orders" className="px-3 text-xs">
            Đơn hàng
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {!hasData ? (
        <EmptyState>Chưa có dữ liệu bán hàng trong khoảng thời gian này.</EmptyState>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {series.length > 1 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {series.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <span className="h-0.5 w-3.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">
                    {metric === "revenue" ? formatCompactCurrency(item.total) : formatNumber(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <ChartContainer config={config} className="aspect-auto min-h-[280px] w-full flex-1">
            {splitByChannel ? (
              <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                {xAxis}
                {yAxis}
                {tooltip}
                {series.map((item) => (
                  <Line
                    key={item.key}
                    dataKey={item.key}
                    type="monotone"
                    stroke={`var(--color-${item.key})`}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={activeDot}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                {xAxis}
                {yAxis}
                {tooltip}
                <Area
                  dataKey="total"
                  type="monotone"
                  stroke="var(--color-total)"
                  strokeWidth={2}
                  fill="var(--color-total)"
                  fillOpacity={0.1}
                  activeDot={activeDot}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ChartContainer>
        </div>
      )}
    </ReportCard>
  );
}
