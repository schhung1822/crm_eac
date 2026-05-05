"use client";

import { TableCards } from "../../crm/_components/table-cards";
import { DateRangeFilter } from "./date-range-filter";
import { SectionCards } from "./section-cards";
import { ChartAreaInteractive } from "./chart-area-interactive";

type DefaultDashboardClientProps = {
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

export default function DefaultDashboardClient({
  stats,
  chartData,
  channelSummary,
}: DefaultDashboardClientProps) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DateRangeFilter />
      <SectionCards stats={stats} />
      <ChartAreaInteractive chartData={chartData} />
      <TableCards channels={channelSummary} />
    </div>
  );
}
