"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import {
  formatCompactCurrency,
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatPercent,
} from "@/app/(main)/dashboard/_components/reports/crm-format";
import { FullValue } from "@/app/(main)/dashboard/_components/reports/full-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CRM_SEGMENTS, getChannelSegment, type CrmSegment } from "@/lib/crm-segments";

import type { ChannelSummary } from "./types";

const SEGMENT_COLORS: Record<CrmSegment, string> = {
  b2b: "var(--report-series-1)",
  b2c: "var(--report-series-2)",
};

const chartConfig = {
  revenue: { label: "Thành tiền" },
  b2b: { label: "B2B", color: SEGMENT_COLORS.b2b },
  b2c: { label: "B2C", color: SEGMENT_COLORS.b2c },
} satisfies ChartConfig;

type SegmentRow = { segment: CrmSegment; revenue: number; orders: number; channels: string[]; fill: string };

function groupBySegment(channels: ChannelSummary[]): SegmentRow[] {
  const rows: Record<CrmSegment, SegmentRow> = {
    b2b: { segment: "b2b", revenue: 0, orders: 0, channels: [], fill: SEGMENT_COLORS.b2b },
    b2c: { segment: "b2c", revenue: 0, orders: 0, channels: [], fill: SEGMENT_COLORS.b2c },
  };

  for (const channel of channels) {
    const row = rows[getChannelSegment(channel.kenh_ban)];
    row.revenue += channel.thanh_tien;
    row.orders += channel.order_count;
    row.channels.push(channel.kenh_ban);
  }

  return [rows.b2b, rows.b2c];
}

/** Tỷ trọng doanh thu B2B / B2C, phân loại theo kênh bán giống các trang Báo cáo B2B / B2C. */
export function SegmentShareChart({ channels }: { channels: ChannelSummary[] }) {
  const segments = groupBySegment(channels);
  const total = segments.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>Tỷ trọng B2B / B2C</CardTitle>
        <CardDescription>Theo thành tiền đơn hoàn thành</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {total <= 0 ? (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
            Chưa có dữ liệu.
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[148px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(_value, _name, item) => {
                        const row = item.payload as SegmentRow;

                        return (
                          <div className="min-w-44 space-y-1">
                            <div className="font-medium">{CRM_SEGMENTS[row.segment].shortLabel}</div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Thành tiền</span>
                              <span className="tabular-nums">{formatCurrency(row.revenue)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span className="tabular-nums">{formatNumber(row.orders)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={segments}
                  dataKey="revenue"
                  nameKey="segment"
                  innerRadius={46}
                  outerRadius={68}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {segments.map((item) => (
                    <Cell key={item.segment} fill={item.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      const centerY = typeof viewBox.cy === "number" ? viewBox.cy : 0;

                      return (
                        <text x={viewBox.cx} y={centerY} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={centerY - 3} className="fill-foreground text-sm font-semibold">
                            {formatKpiCurrency(total)}
                          </tspan>
                          <tspan x={viewBox.cx} y={centerY + 13} className="fill-muted-foreground text-[10px]">
                            thành tiền
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <ul className="divide-y">
              {segments.map((item) => (
                <li key={item.segment} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{CRM_SEGMENTS[item.segment].shortLabel}</p>
                    <p className="text-muted-foreground truncate text-xs" title={item.channels.join(", ")}>
                      {item.channels.length > 0 ? item.channels.join(", ") : "Không có kênh"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatPercent(item.revenue, total)}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      <FullValue fullValue={formatCurrency(item.revenue)}>
                        {formatCompactCurrency(item.revenue)}
                      </FullValue>
                      {" · "}
                      {formatNumber(item.orders)} đơn
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
