import { getChannelSalesSummary, getCRMStats } from "@/lib/crm-revenue";
import { getDailySalesTrend, getOrderStatusSummary } from "@/lib/default-dashboard";

import DefaultDashboardShell from "./_components/default-dashboard-shell";
import type { ChannelSummary, ChartPoint, DashboardStats, OrderStatusSummary } from "./_components/types";

export const dynamic = "force-dynamic";

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  totalTienHang: 0,
  totalDiscount: 0,
  totalThanhTien: 0,
  completedRevenue: 0,
  totalQuantity: 0,
};

function normalizeStats(value: DashboardStats | null | undefined): DashboardStats {
  if (!value) {
    return EMPTY_STATS;
  }

  return {
    totalOrders: Number(value.totalOrders) || 0,
    totalTienHang: Number(value.totalTienHang) || 0,
    totalDiscount: Number(value.totalDiscount) || 0,
    totalThanhTien: Number(value.totalThanhTien) || 0,
    completedRevenue: Number(value.completedRevenue) || 0,
    totalQuantity: Number(value.totalQuantity) || 0,
  };
}

function fulfilledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Không có filter trên URL => mặc định lọc theo tháng này. */
function resolveDateRange(params: Record<string, string>): { from: Date; to: Date } {
  const now = new Date();
  const parsedFrom = params.from ? new Date(`${params.from}T00:00:00`) : null;
  const parsedTo = params.to ? new Date(`${params.to}T23:59:59.999`) : null;

  const from =
    parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : now;

  if (!params.to) {
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
}

function resolvePreviousDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const rangeDuration = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - rangeDuration);

  return { from: previousFrom, to: previousTo };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const previousRange = resolvePreviousDateRange(from, to);

  const [statsResult, previousStatsResult, trendResult, channelSummaryResult, statusSummaryResult] =
    await Promise.allSettled([
      getCRMStats(from, to),
      getCRMStats(previousRange.from, previousRange.to),
      getDailySalesTrend(from, to),
      getChannelSalesSummary(from, to, true),
      getOrderStatusSummary(from, to),
    ]);

  const results = [statsResult, previousStatsResult, trendResult, channelSummaryResult, statusSummaryResult];
  const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  const hasDataError = errors.length > 0;

  if (hasDataError) {
    console.error("Default dashboard data fallback activated", errors);
  }

  const stats = normalizeStats(fulfilledOr(statsResult, EMPTY_STATS));
  const previousStats = normalizeStats(fulfilledOr(previousStatsResult, EMPTY_STATS));
  const chartData = fulfilledOr<ChartPoint[]>(trendResult, []);
  const channelSummary = fulfilledOr<ChannelSummary[]>(channelSummaryResult, []);
  const statusSummary = fulfilledOr<OrderStatusSummary[]>(statusSummaryResult, []);

  return (
    <DefaultDashboardShell
      stats={stats}
      previousStats={previousStats}
      chartData={chartData}
      channelSummary={channelSummary}
      statusSummary={statusSummary}
      hasDataError={hasDataError}
    />
  );
}
