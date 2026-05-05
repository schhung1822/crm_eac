import { getChannelSalesSummary, getCRMStats } from "@/lib/crm-revenue";
import { getChannels } from "@/lib/orders";

import DefaultDashboardShell from "./_components/default-dashboard-shell";

export const dynamic = "force-dynamic";

const EMPTY_STATS = {
  totalOrders: 0,
  totalTienHang: 0,
  totalThanhTien: 0,
  totalQuantity: 0,
};

const EMPTY_CHANNEL_SUMMARY: Array<{
  kenh_ban: string;
  order_count: number;
  quantity: number;
  tien_hang: number;
  giam_gia: number;
  thanh_tien: number;
}> = [];

function normalizeStats(value: Awaited<ReturnType<typeof getCRMStats>> | null | undefined) {
  if (!value) {
    return EMPTY_STATS;
  }

  return {
    totalOrders: Number(value.totalOrders) || 0,
    totalTienHang: Number(value.totalTienHang) || 0,
    totalThanhTien: Number(value.totalThanhTien) || 0,
    totalQuantity: Number(value.totalQuantity) || 0,
  };
}

function normalizeChannelSummary(value: Awaited<ReturnType<typeof getChannelSalesSummary>> | null | undefined) {
  return Array.isArray(value) ? value : EMPTY_CHANNEL_SUMMARY;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  // Ensure toDate is end of day
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  const [channelsResult, channelSummaryResult, statsResult] = await Promise.allSettled([
    getChannels({ from, to, limit: 10000 }),
    getChannelSalesSummary(from, to),
    getCRMStats(from, to),
  ]);

  if (
    channelsResult.status === "rejected" ||
    channelSummaryResult.status === "rejected" ||
    statsResult.status === "rejected"
  ) {
    console.error("Default dashboard data fallback activated", {
      channelsError: channelsResult.status === "rejected" ? channelsResult.reason : null,
      channelSummaryError: channelSummaryResult.status === "rejected" ? channelSummaryResult.reason : null,
      statsError: statsResult.status === "rejected" ? statsResult.reason : null,
    });
  }

  const channels = channelsResult.status === "fulfilled" ? asArray(channelsResult.value) : [];
  const channelSummary =
    channelSummaryResult.status === "fulfilled" ? normalizeChannelSummary(channelSummaryResult.value) : EMPTY_CHANNEL_SUMMARY;
  const stats = statsResult.status === "fulfilled" ? normalizeStats(statsResult.value) : EMPTY_STATS;

  // Build chart data (group by date)
  const chartMap: Record<string, { orders: number; revenue: number }> = {};
  for (const c of channels) {
    const d = c.create_time instanceof Date ? c.create_time : new Date(c.create_time);
    if (Number.isNaN(d.getTime())) {
      continue;
    }
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    chartMap[key] ??= { orders: 0, revenue: 0 };
    chartMap[key].orders += 1;
    chartMap[key].revenue += Number(c.thanh_tien) || 0;
  }

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({ date, orders: chartMap[date].orders, revenue: chartMap[date].revenue }));

  return <DefaultDashboardShell stats={stats} chartData={chartData} channelSummary={channelSummary} />;
}
