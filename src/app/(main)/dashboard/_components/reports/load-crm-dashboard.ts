import { getCrmCustomerInsights, type CrmCustomerInsights } from "@/lib/crm-customers";
import {
  getBrandConversionFunnel,
  getChannelSalesSummary,
  getCRMStats,
  getRevenueByBranchBarChart,
  getTopProductsByQuantity,
  getTopSalesByRevenue,
} from "@/lib/crm-revenue";
import {
  getCustomerRetention,
  getOrderStatusBreakdown,
  getRevenueTrend,
  getTopCustomersByRevenue,
  type RevenueTrend,
} from "@/lib/crm-revenue-insights";

const EMPTY_STATS: Awaited<ReturnType<typeof getCRMStats>> = {
  totalOrders: 0,
  totalCustomers: 0,
  totalQuantity: 0,
  totalTienHang: 0,
  totalDiscount: 0,
  totalThanhTien: 0,
  completedOrders: 0,
  completedRevenue: 0,
};

const EMPTY_TREND: RevenueTrend = { granularity: "month", channels: [], points: [] };

const EMPTY_RETENTION: Awaited<ReturnType<typeof getCustomerRetention>> = {
  customers: 0,
  newCustomers: 0,
  returningCustomers: 0,
  repeatCustomers: 0,
};

const EMPTY_CUSTOMER_INSIGHTS: CrmCustomerInsights = {
  summary: { totalCustomers: 0, activeCustomers: 0, companyCustomers: 0, dormantCustomers: 0 },
  branchDistribution: [],
  classDistribution: [],
  recencyDistribution: [],
  createdTrend: [],
  topCustomers: [],
};

export function parseDateRange(params: Record<string, string | undefined>) {
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  // Ensure toDate is end of day
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
}

/** Kỳ liền trước có cùng độ dài; lọc "Tất cả" thì không có kỳ để so sánh. */
function previousRange(from?: Date, to?: Date) {
  if (!from || !to) return null;

  const prevTo = new Date(from.getTime() - 1);
  return { from: new Date(prevTo.getTime() - (to.getTime() - from.getTime())), to: prevTo };
}

/** Một báo cáo lỗi thì trả dữ liệu rỗng cho riêng báo cáo đó, không làm hỏng cả trang. */
async function settle<T, F = T>(label: string, promise: Promise<T>, fallback: F): Promise<T | F> {
  try {
    return (await promise) ?? fallback;
  } catch (error) {
    console.error(`CRM dashboard data fallback activated: ${label}`, error);
    return fallback;
  }
}

export async function loadB2bDashboard(from?: Date, to?: Date) {
  const previous = previousRange(from, to);
  const [
    stats,
    previousStats,
    trend,
    orderStatuses,
    branches,
    topCustomers,
    topCustomersByOrders,
    topSales,
    topProducts,
    brands,
    channelSummary,
  ] = await Promise.all([
    settle("stats", getCRMStats(from, to, "b2b"), EMPTY_STATS),
    previous ? settle("previousStats", getCRMStats(previous.from, previous.to, "b2b"), null) : null,
    settle("trend", getRevenueTrend(from, to, "b2b"), EMPTY_TREND),
    settle("orderStatuses", getOrderStatusBreakdown(from, to, "b2b"), []),
    settle(
      "revenueByBranch",
      getRevenueByBranchBarChart(from, to, 12, "b2b").then((result) => result.data),
      [],
    ),
    settle("topCustomers", getTopCustomersByRevenue(from, to, "b2b", 15), []),
    settle("topCustomersByOrders", getTopCustomersByRevenue(from, to, "b2b", 15, "orders"), []),
    settle("topSales", getTopSalesByRevenue(from, to, undefined, "b2b"), []),
    settle("topProducts", getTopProductsByQuantity(from, to, 10, "b2b"), []),
    settle("brands", getBrandConversionFunnel(from, to, "b2b"), []),
    settle("channelSummary", getChannelSalesSummary(from, to, false, "b2b"), []),
  ]);

  return {
    stats,
    previousStats,
    trend,
    orderStatuses,
    branches,
    topCustomers,
    topCustomersByOrders,
    topSales,
    topProducts,
    brands,
    channelSummary,
  };
}

export async function loadB2cDashboard(from?: Date, to?: Date) {
  const [stats, trend, orderStatuses, retention, topProducts, brands, channelSummary] = await Promise.all([
    settle("stats", getCRMStats(from, to, "b2c"), EMPTY_STATS),
    settle("trend", getRevenueTrend(from, to, "b2c"), EMPTY_TREND),
    settle("orderStatuses", getOrderStatusBreakdown(from, to, "b2c"), []),
    settle("retention", getCustomerRetention(from, to, "b2c"), EMPTY_RETENTION),
    settle("topProducts", getTopProductsByQuantity(from, to, 10, "b2c"), []),
    settle("brands", getBrandConversionFunnel(from, to, "b2c"), []),
    settle("channelSummary", getChannelSalesSummary(from, to, false, "b2c"), []),
  ]);

  return { stats, trend, orderStatuses, retention, topProducts, brands, channelSummary };
}

export async function loadCustomerDashboard(from?: Date, to?: Date) {
  return settle("customerInsights", getCrmCustomerInsights(from, to), EMPTY_CUSTOMER_INSIGHTS);
}

export type B2bDashboardData = Awaited<ReturnType<typeof loadB2bDashboard>>;
export type B2cDashboardData = Awaited<ReturnType<typeof loadB2cDashboard>>;
