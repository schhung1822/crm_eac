"use client";

import dynamic from "next/dynamic";

import type { ChannelSummary, ChartPoint, DashboardStats, OrderStatusSummary } from "./types";

const DefaultDashboardClient = dynamic(() => import("./default-dashboard-client"), {
  ssr: false,
  loading: () => <div className="bg-muted/20 @container/main min-h-[320px] animate-pulse rounded-lg border" />,
});

type DefaultDashboardShellProps = {
  stats: DashboardStats;
  previousStats: DashboardStats;
  chartData: ChartPoint[];
  channelSummary: ChannelSummary[];
  statusSummary: OrderStatusSummary[];
  hasDataError: boolean;
};

export default function DefaultDashboardShell(props: DefaultDashboardShellProps) {
  return <DefaultDashboardClient {...props} />;
}
