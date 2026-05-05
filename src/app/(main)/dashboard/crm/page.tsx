/* eslint-disable complexity */
import { getCrmCustomerInsights } from "@/lib/crm-customers";
import {
  getRevenueByChannelChart,
  getRevenueByBranchBarChart,
  getCRMStats,
  getBrandConversionFunnel,
  getChannelSalesSummary,
  getTopProductsByQuantity,
  getTopSalesByRevenue,
} from "@/lib/crm-revenue";

export const dynamic = "force-dynamic";

import CRMDashboardShell from "./_components/crm-dashboard-shell";

const EMPTY_STATS = {
  totalOrders: 0,
  totalTienHang: 0,
  totalThanhTien: 0,
  totalQuantity: 0,
};

const EMPTY_REVENUE_BY_CHANNEL = {
  data: [] as Array<{ source: string; revenue: number; fill: string }>,
  config: {
    revenue: {
      label: "Doanh thu",
    },
  },
};

const EMPTY_REVENUE_BY_BRANCH = {
  data: [] as Array<{ name: string; actual: number; remaining: number }>,
  config: {
    actual: { label: "Doanh thu", color: "var(--chart-1)" },
    remaining: { label: " ", color: "var(--chart-2)" },
    label: { color: "var(--primary-foreground)" },
  },
};

const EMPTY_CUSTOMER_INSIGHTS = {
  summary: {
    totalCustomers: 0,
    activeCustomers: 0,
    companyCustomers: 0,
    dormantCustomers: 0,
  },
  branchDistribution: [] as Array<{ label: string; value: number; fill: string }>,
  classDistribution: [] as Array<{ label: string; value: number; fill: string }>,
  recencyDistribution: [] as Array<{ label: string; value: number; fill: string }>,
  createdTrend: [] as Array<{ period: string; customers: number }>,
  topCustomers: [] as Array<{
    name: string;
    branch: string;
    company: string;
    totalRevenue: number;
    lastPayment: string;
  }>,
};

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

function normalizeRevenueByChannel(value: Awaited<ReturnType<typeof getRevenueByChannelChart>> | null | undefined) {
  if (!value) {
    return EMPTY_REVENUE_BY_CHANNEL;
  }

  return {
    data: Array.isArray(value.data) ? value.data : EMPTY_REVENUE_BY_CHANNEL.data,
    config: value.config,
  };
}

function normalizeRevenueByBranch(value: Awaited<ReturnType<typeof getRevenueByBranchBarChart>> | null | undefined) {
  if (!value) {
    return EMPTY_REVENUE_BY_BRANCH;
  }

  return {
    data: Array.isArray(value.data) ? value.data : EMPTY_REVENUE_BY_BRANCH.data,
    config: value.config,
  };
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

  const [
    revenueByChannelResult,
    revenueByBranchResult,
    statsResult,
    brandFunnelResult,
    topProductsResult,
    topSalesResult,
    channelSummaryResult,
    customerInsightsResult,
  ] = await Promise.allSettled([
    getRevenueByChannelChart(from, to),
    getRevenueByBranchBarChart(from, to, 12),
    getCRMStats(from, to),
    getBrandConversionFunnel(from, to),
    getTopProductsByQuantity(from, to, 10),
    getTopSalesByRevenue(from, to),
    getChannelSalesSummary(from, to),
    getCrmCustomerInsights(from, to),
  ]);

  if (
    revenueByChannelResult.status === "rejected" ||
    revenueByBranchResult.status === "rejected" ||
    statsResult.status === "rejected" ||
    brandFunnelResult.status === "rejected" ||
    topProductsResult.status === "rejected" ||
    topSalesResult.status === "rejected" ||
    channelSummaryResult.status === "rejected" ||
    customerInsightsResult.status === "rejected"
  ) {
    console.error("CRM dashboard data fallback activated", {
      revenueByChannelError: revenueByChannelResult.status === "rejected" ? revenueByChannelResult.reason : null,
      revenueByBranchError: revenueByBranchResult.status === "rejected" ? revenueByBranchResult.reason : null,
      statsError: statsResult.status === "rejected" ? statsResult.reason : null,
      brandFunnelError: brandFunnelResult.status === "rejected" ? brandFunnelResult.reason : null,
      topProductsError: topProductsResult.status === "rejected" ? topProductsResult.reason : null,
      topSalesError: topSalesResult.status === "rejected" ? topSalesResult.reason : null,
      channelSummaryError: channelSummaryResult.status === "rejected" ? channelSummaryResult.reason : null,
      customerInsightsError: customerInsightsResult.status === "rejected" ? customerInsightsResult.reason : null,
    });
  }

  const revenueByChannel =
    revenueByChannelResult.status === "fulfilled"
      ? normalizeRevenueByChannel(revenueByChannelResult.value)
      : EMPTY_REVENUE_BY_CHANNEL;
  const revenueByBranchBars =
    revenueByBranchResult.status === "fulfilled"
      ? normalizeRevenueByBranch(revenueByBranchResult.value)
      : EMPTY_REVENUE_BY_BRANCH;
  const stats = statsResult.status === "fulfilled" ? normalizeStats(statsResult.value) : EMPTY_STATS;
  const brandFunnel = brandFunnelResult.status === "fulfilled" ? asArray(brandFunnelResult.value) : [];
  const topProducts = topProductsResult.status === "fulfilled" ? asArray(topProductsResult.value) : [];
  const topSales = topSalesResult.status === "fulfilled" ? asArray(topSalesResult.value) : [];
  const channelSummary = channelSummaryResult.status === "fulfilled" ? asArray(channelSummaryResult.value) : [];
  const customerInsights =
    customerInsightsResult.status === "fulfilled" ? customerInsightsResult.value : EMPTY_CUSTOMER_INSIGHTS;

  return (
    <CRMDashboardShell
      stats={stats}
      customerInsights={customerInsights}
      revenueByChannel={revenueByChannel}
      revenueByBranchBars={revenueByBranchBars}
      brandFunnel={brandFunnel}
      topProducts={topProducts}
      topSales={topSales}
      channelSummary={channelSummary}
    />
  );
}
