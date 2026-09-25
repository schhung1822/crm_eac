"use client";

import { CrmDashboardHeader } from "./crm-dashboard-header";
import { formatCurrency, formatKpiCurrency, formatNumber, formatPercent } from "./crm-format";
import { CustomerRetentionCard } from "./customer-revenue-cards";
import { ChannelRevenueCard } from "./insight-cards";
import type { B2cDashboardData } from "./load-crm-dashboard";
import { BrandOrdersCard, TopProductsCard } from "./operational-cards";
import { OrderStatusCard } from "./order-status-card";
import { RevenueTrendCard } from "./revenue-trend-card";
import { SectionCards } from "./section-cards";
import { TableCards } from "./table-cards";

export default function CRMB2cDashboardClient({
  stats,
  trend,
  orderStatuses,
  retention,
  topProducts,
  brands,
  channelSummary,
}: B2cDashboardData) {
  const averageOrderValue = stats.totalOrders > 0 ? stats.totalThanhTien / stats.totalOrders : 0;
  const itemsPerOrder = stats.totalOrders > 0 ? stats.totalQuantity / stats.totalOrders : 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <CrmDashboardHeader segment="b2c" />

      <SectionCards
        cards={[
          { label: "Doanh thu B2C", value: formatCurrency(stats.totalThanhTien) },
          {
            label: "Đơn hoàn thành",
            value: formatNumber(stats.completedOrders),
            hint: `${formatPercent(stats.completedOrders, stats.totalOrders)} / ${formatNumber(stats.totalOrders)} đơn`,
          },
          { label: "Giá trị đơn trung bình", value: formatCurrency(averageOrderValue) },
          {
            label: "Sản phẩm bán ra",
            value: formatNumber(stats.totalQuantity),
            hint: `${itemsPerOrder.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} sản phẩm / đơn`,
          },
          { label: "Khách hàng mua", value: formatNumber(stats.totalCustomers) },
          {
            label: "Tỷ lệ mua lặp lại",
            value: formatPercent(retention.repeatCustomers, retention.customers),
            hint: `${formatNumber(retention.repeatCustomers)} khách mua từ 2 đơn`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 @5xl/main:grid-cols-3">
        <div className="min-w-0 @5xl/main:col-span-2">
          <RevenueTrendCard trend={trend} title="Xu hướng bán hàng theo sàn" splitByChannel />
        </div>
        <OrderStatusCard statuses={orderStatuses} />
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        <ChannelRevenueCard title="Tỷ trọng doanh thu theo sàn" channels={channelSummary} identityColors />
        <CustomerRetentionCard retention={retention} />
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        <TopProductsCard topProducts={topProducts} />
        <BrandOrdersCard brands={brands} totalOrders={stats.totalOrders} />
      </div>

      <TableCards title="Hiệu suất theo sàn / kênh B2C" channels={channelSummary} />
    </div>
  );
}
