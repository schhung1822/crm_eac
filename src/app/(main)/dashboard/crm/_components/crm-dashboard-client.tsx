"use client";

import type { ChartConfig } from "@/components/ui/chart";

import { CustomerInsightCards } from "./customer-insight-cards";
import { DateRangeFilter } from "./date-range-filter";
import { InsightCards } from "./insight-cards";
import { OperationalCards } from "./operational-cards";
import { type ChannelSummary } from "./schema";
import { SectionCards } from "./section-cards";
import { TableCards } from "./table-cards";

type PieDatum = {
  source: string;
  revenue: number;
  fill: string;
};

type BranchBarRow = {
  name: string;
  actual: number;
  remaining: number;
};

type BrandFunnelItem = {
  stage: string;
  value: number;
  fill: string;
};

type ProductRankItem = {
  product: string;
  quantity: number;
  percentage: number;
};

type SalesRankItem = {
  seller: string;
  revenue: number;
  orders: number;
};

type CRMDashboardClientProps = {
  stats: {
    totalOrders: number;
    totalTienHang: number;
    totalThanhTien: number;
    totalQuantity: number;
  };
  customerInsights: {
    summary: {
      totalCustomers: number;
      activeCustomers: number;
      companyCustomers: number;
      dormantCustomers: number;
    };
    branchDistribution: Array<{
      label: string;
      value: number;
      fill: string;
    }>;
    classDistribution: Array<{
      label: string;
      value: number;
      fill: string;
    }>;
    recencyDistribution: Array<{
      label: string;
      value: number;
      fill: string;
    }>;
    createdTrend: Array<{
      period: string;
      customers: number;
    }>;
    topCustomers: Array<{
      name: string;
      branch: string;
      company: string;
      totalRevenue: number;
      lastPayment: string;
    }>;
  };
  revenueByChannel: {
    data: PieDatum[];
    config: ChartConfig;
  };
  revenueByBranchBars: {
    data: BranchBarRow[];
    config: ChartConfig;
  };
  brandFunnel: BrandFunnelItem[];
  topProducts: ProductRankItem[];
  topSales: SalesRankItem[];
  channelSummary: ChannelSummary[];
};

export default function CRMDashboardClient({
  stats,
  customerInsights,
  revenueByChannel,
  revenueByBranchBars,
  brandFunnel,
  topProducts,
  topSales,
  channelSummary,
}: CRMDashboardClientProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <DateRangeFilter />
      <SectionCards stats={stats} />
      <CustomerInsightCards {...customerInsights} />
      <InsightCards revenueByChannel={revenueByChannel} revenueByBranchBars={revenueByBranchBars} />
      <OperationalCards brandFunnel={brandFunnel} topProducts={topProducts} topSales={topSales} />
      <TableCards channels={channelSummary} />
    </div>
  );
}
