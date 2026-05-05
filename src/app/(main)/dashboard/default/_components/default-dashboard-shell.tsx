"use client";

import dynamic from "next/dynamic";

const DefaultDashboardClient = dynamic(() => import("./default-dashboard-client"), {
  ssr: false,
  loading: () => <div className="@container/main min-h-[320px] animate-pulse rounded-lg border bg-muted/20" />,
});

type DefaultDashboardShellProps = {
  stats: {
    totalOrders: number;
    totalTienHang: number;
    totalThanhTien: number;
    totalQuantity: number;
  };
  chartData: Array<{ date: string; orders: number; revenue: number }>;
  channelSummary: Array<{
    kenh_ban: string;
    order_count: number;
    quantity: number;
    tien_hang: number;
    giam_gia: number;
    thanh_tien: number;
  }>;
};

export default function DefaultDashboardShell(props: DefaultDashboardShellProps) {
  return <DefaultDashboardClient {...props} />;
}
