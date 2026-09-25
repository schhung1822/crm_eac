"use client";

import { CrmDashboardHeader } from "./crm-dashboard-header";
import { formatCurrency, formatKpiCurrency, formatNumber, formatPercent } from "./crm-format";
import type { B2bDashboardData } from "./load-crm-dashboard";
import { OrderStatusCard } from "./order-status-card";
import { RankedBarList, TabbedReportCard } from "./report-card";
import {
  branchItems,
  brandItems,
  channelItems,
  customerItems,
  customerOrderItems,
  productItems,
  salesItems,
} from "./report-items";
import { RevenueTrendCard } from "./revenue-trend-card";
import { SectionCards } from "./section-cards";
import { TableCards } from "./table-cards";

function averageOrderValue(stats: { totalOrders: number; totalThanhTien: number }) {
  return stats.totalOrders > 0 ? stats.totalThanhTien / stats.totalOrders : 0;
}

export default function CRMB2bDashboardClient({
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
}: B2bDashboardData) {
  const revenuePerCustomer = stats.totalCustomers > 0 ? stats.totalThanhTien / stats.totalCustomers : 0;
  const compare = (current: number, previous: number | undefined, higherIsBetter = true) =>
    previous === undefined ? undefined : { current, previous, higherIsBetter };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <CrmDashboardHeader segment="b2b" />

      <SectionCards
        cards={[
          {
            label: "Doanh thu B2B",
            value: formatKpiCurrency(stats.totalThanhTien),
            fullValue: formatCurrency(stats.totalThanhTien),
            comparison: compare(stats.totalThanhTien, previousStats?.totalThanhTien),
          },
          {
            label: "Doanh thu hoàn thành",
            value: formatKpiCurrency(stats.completedRevenue),
            fullValue: formatCurrency(stats.completedRevenue),
            comparison: compare(stats.completedRevenue, previousStats?.completedRevenue),
            hint: `${formatPercent(stats.completedRevenue, stats.totalThanhTien)} tổng doanh thu`,
          },
          {
            label: "Số đơn",
            value: formatNumber(stats.totalOrders),
            comparison: compare(stats.totalOrders, previousStats?.totalOrders),
          },
          {
            label: "Giá trị đơn trung bình",
            value: formatKpiCurrency(averageOrderValue(stats)),
            fullValue: formatCurrency(averageOrderValue(stats)),
            comparison: compare(averageOrderValue(stats), previousStats ? averageOrderValue(previousStats) : undefined),
          },
          {
            label: "Khách hàng / đại lý mua",
            value: formatNumber(stats.totalCustomers),
            comparison: compare(stats.totalCustomers, previousStats?.totalCustomers),
            hint: `TB ${formatKpiCurrency(revenuePerCustomer)} / khách`,
          },
          {
            label: "Chiết khấu",
            value: formatKpiCurrency(stats.totalDiscount),
            fullValue: formatCurrency(stats.totalDiscount),
            comparison: compare(stats.totalDiscount, previousStats?.totalDiscount, false),
            hint: `${formatPercent(stats.totalDiscount, stats.totalTienHang)} tiền hàng`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 @5xl/main:grid-cols-3">
        <div className="min-w-0 @5xl/main:col-span-2">
          <RevenueTrendCard trend={trend} title="Xu hướng bán hàng" />
        </div>
        <OrderStatusCard statuses={orderStatuses} />
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <TabbedReportCard
          title="Cơ cấu doanh thu"
          description="Tỷ lệ trên tổng doanh thu B2B"
          tabs={[
            {
              value: "channel",
              label: "Kênh bán",
              content: (
                <RankedBarList items={channelItems(channelSummary)} emptyText="Chưa có dữ liệu theo kênh bán." />
              ),
            },
            {
              value: "branch",
              label: "Chi nhánh",
              content: (
                <RankedBarList
                  items={branchItems(branches, stats.totalThanhTien)}
                  emptyText="Chưa có dữ liệu theo chi nhánh."
                />
              ),
            },
            {
              value: "sales",
              label: "Nhân viên",
              content: (
                <RankedBarList
                  items={salesItems(topSales, stats.totalThanhTien)}
                  emptyText="Chưa có dữ liệu doanh thu sale."
                />
              ),
            },
          ]}
        />

        <TabbedReportCard
          title="Khách hàng / đại lý hàng đầu"
          description="Số đơn · tỷ lệ trên tổng doanh thu B2B"
          tabs={[
            {
              value: "revenue",
              label: "Theo doanh thu",
              content: (
                <RankedBarList
                  items={customerItems(topCustomers, stats.totalThanhTien)}
                  emptyText="Chưa có dữ liệu khách hàng trong kỳ."
                />
              ),
            },
            {
              value: "orders",
              label: "Theo số đơn",
              content: (
                <RankedBarList
                  items={customerOrderItems(topCustomersByOrders)}
                  emptyText="Chưa có dữ liệu khách hàng trong kỳ."
                />
              ),
            },
          ]}
        />

        <TabbedReportCard
          title="Sản phẩm & thương hiệu"
          description="Số lượng bán ra · số đơn theo thương hiệu"
          className="@3xl/main:col-span-2 @5xl/main:col-span-1"
          tabs={[
            {
              value: "products",
              label: "Sản phẩm",
              content: (
                <RankedBarList items={productItems(topProducts)} emptyText="Chưa có dữ liệu sản phẩm bán chạy." />
              ),
            },
            {
              value: "brands",
              label: "Thương hiệu",
              content: (
                <RankedBarList
                  items={brandItems(brands, stats.totalOrders)}
                  emptyText="Chưa có dữ liệu đơn hàng theo thương hiệu."
                />
              ),
            },
          ]}
        />
      </div>

      <TableCards title="Hiệu suất theo kênh bán" channels={channelSummary} />
    </div>
  );
}
