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

/** Không có filter trên URL => mặc định lọc theo tháng này. */
function resolveDateRange(params: Record<string, string>): { from?: Date; to?: Date } {
  const now = new Date();
  const hasRangeParam = Boolean(params.from || params.to);

  const from = params.from
    ? new Date(params.from)
    : hasRangeParam
      ? undefined
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.to ? new Date(params.to) : hasRangeParam ? undefined : now;

  // Ensure toDate is end of day
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
}

/** Gom đơn theo ngày để dựng dữ liệu biểu đồ. */
function buildChartData(
  channels: Array<{ create_time: Date | string; thanh_tien?: unknown }>,
): Array<{ date: string; orders: number; revenue: number }> {
  const chartMap = new Map<string, { orders: number; revenue: number }>();

  for (const channel of channels) {
    const createdAt = channel.create_time instanceof Date ? channel.create_time : new Date(channel.create_time);

    if (Number.isNaN(createdAt.getTime())) {
      continue;
    }

    const key = createdAt.toISOString().slice(0, 10);
    const bucket = chartMap.get(key) ?? { orders: 0, revenue: 0 };

    bucket.orders += 1;
    bucket.revenue += Number(channel.thanh_tien) || 0;
    chartMap.set(key, bucket);
  }

  return [...chartMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({ date, orders: bucket.orders, revenue: bucket.revenue }));
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);

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
    channelSummaryResult.status === "fulfilled"
      ? normalizeChannelSummary(channelSummaryResult.value)
      : EMPTY_CHANNEL_SUMMARY;
  const stats = statsResult.status === "fulfilled" ? normalizeStats(statsResult.value) : EMPTY_STATS;

  return <DefaultDashboardShell stats={stats} chartData={buildChartData(channels)} channelSummary={channelSummary} />;
}
