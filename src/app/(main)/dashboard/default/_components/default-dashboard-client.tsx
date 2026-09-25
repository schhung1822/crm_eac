"use client";

import { ChannelPerformance } from "./channel-performance";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { DateRangeFilter } from "./date-range-filter";
import { SectionCards } from "./section-cards";
import { SegmentShareChart } from "./segment-share-chart";
import { StatusSummary } from "./status-summary";
import type { ChannelSummary, ChartPoint, DashboardStats, OrderStatusSummary } from "./types";

type DefaultDashboardClientProps = {
  stats: DashboardStats;
  previousStats: DashboardStats;
  chartData: ChartPoint[];
  channelSummary: ChannelSummary[];
  statusSummary: OrderStatusSummary[];
  hasDataError: boolean;
};

export default function DefaultDashboardClient({
  stats,
  previousStats,
  chartData,
  channelSummary,
  statusSummary,
  hasDataError,
}: DefaultDashboardClientProps) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <section className="md:py-2">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Báo cáo tổng quan</h1>
            </div>
          </div>
          <DateRangeFilter />
        </div>
      </section>

      {hasDataError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          Một phần dữ liệu báo cáo chưa tải được. Vui lòng thử tải lại trang.
        </div>
      ) : null}

      <SectionCards stats={stats} previousStats={previousStats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ChartAreaInteractive chartData={chartData} />
        </div>
        <StatusSummary data={statusSummary} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <SegmentShareChart channels={channelSummary} />
        <ChannelPerformance channels={channelSummary} />
      </div>
    </div>
  );
}
