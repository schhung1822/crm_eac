import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from "./crm-format";
import type { RankedBarItem } from "./report-card";
import type { ChannelSummary } from "./schema";

/** Chuyển dữ liệu báo cáo thành dòng cho RankedBarList. `meta` giữ ngắn để thanh thẳng hàng. */

export function channelItems(channels: ChannelSummary[], colors?: Map<string, string>): RankedBarItem[] {
  const total = channels.reduce((sum, item) => sum + item.thanh_tien, 0);

  return channels.map((item) => ({
    key: item.kenh_ban,
    label: item.kenh_ban,
    title: `${item.kenh_ban} · ${formatNumber(item.order_count)} đơn`,
    value: item.thanh_tien,
    valueLabel: formatCompactCurrency(item.thanh_tien),
    fullValue: formatCurrency(item.thanh_tien),
    meta: formatPercent(item.thanh_tien, total),
    color: colors?.get(item.kenh_ban),
  }));
}

export function branchItems(branches: Array<{ name: string; actual: number }>, totalRevenue: number): RankedBarItem[] {
  return branches.map((item) => ({
    key: item.name,
    label: item.name,
    value: item.actual,
    valueLabel: formatCompactCurrency(item.actual),
    fullValue: formatCurrency(item.actual),
    meta: formatPercent(item.actual, totalRevenue),
  }));
}

export function salesItems(
  sales: Array<{ seller: string; revenue: number; orders: number }>,
  totalRevenue: number,
): RankedBarItem[] {
  return sales.map((item) => ({
    key: item.seller,
    label: item.seller,
    value: item.revenue,
    valueLabel: formatCompactCurrency(item.revenue),
    fullValue: formatCurrency(item.revenue),
    meta: `${formatNumber(item.orders)} đơn · ${formatPercent(item.revenue, totalRevenue)}`,
  }));
}

export function customerItems(
  customers: Array<{ name: string; phone: string; orders: number; revenue: number; lastOrder: string }>,
  totalRevenue: number,
): RankedBarItem[] {
  return customers.map((item, index) => ({
    key: `${item.name}-${item.phone}-${index}`,
    label: item.name,
    title: item.lastOrder ? `${item.name} · mua gần nhất ${item.lastOrder}` : item.name,
    value: item.revenue,
    valueLabel: formatCompactCurrency(item.revenue),
    fullValue: formatCurrency(item.revenue),
    meta: `${formatNumber(item.orders)} đơn · ${formatPercent(item.revenue, totalRevenue)}`,
  }));
}

/** Top khách theo số đơn (truy vấn đã sắp xếp theo số đơn). */
export function customerOrderItems(
  customers: Array<{ name: string; phone: string; orders: number; revenue: number; lastOrder: string }>,
): RankedBarItem[] {
  return [...customers]
    .sort((a, b) => b.orders - a.orders)
    .map((item, index) => ({
      key: `${item.name}-${item.phone}-${index}`,
      label: item.name,
      title: item.lastOrder ? `${item.name} · mua gần nhất ${item.lastOrder}` : item.name,
      value: item.orders,
      valueLabel: `${formatNumber(item.orders)} đơn`,
      meta: formatCompactCurrency(item.revenue),
    }));
}

export function productItems(products: Array<{ product: string; quantity: number; revenue: number }>): RankedBarItem[] {
  return products.map((item) => ({
    key: item.product,
    label: item.product,
    value: item.quantity,
    valueLabel: `${formatNumber(item.quantity)} sp`,
    meta: formatCompactCurrency(item.revenue),
  }));
}

export function brandItems(brands: Array<{ stage: string; value: number }>, totalOrders: number): RankedBarItem[] {
  return brands.map((item) => ({
    key: item.stage,
    label: item.stage,
    value: item.value,
    valueLabel: `${formatNumber(item.value)} đơn`,
    meta: formatPercent(item.value, totalOrders),
  }));
}
