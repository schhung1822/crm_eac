import { unstable_cache } from "next/cache";

import {
  buildRevenueHorizontalBars,
  type RevenueGroupRow,
} from "@/app/(main)/dashboard/_components/reports/crm.config";
import { buildWhere, CHANNEL_SQL, CUSTOMER_KEY_SQL } from "@/lib/crm-order-filters";
import type { CrmSegment } from "@/lib/crm-segments";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

function mapRows(rows: any[]): RevenueGroupRow[] {
  return (rows ?? []).map((row) => ({
    name: String(row.name ?? "Khong ro"),
    revenue: Number(row.revenue) || 0,
  }));
}

export const getRevenueByBranchBarChart = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 12, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);

    const [rows] = await db.query<any[]>(
      `
      SELECT COALESCE(brand, 'Khong ro') AS name,
             SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      GROUP BY COALESCE(brand, 'Khong ro')
      ORDER BY revenue DESC
      LIMIT ?
      `,
      [...params, limit],
    );

    return buildRevenueHorizontalBars(mapRows(rows));
  },
  ["crm-revenue-branch-bars"],
  { revalidate: 300 },
);

/*
 * Mỗi dòng orders_eac là một sản phẩm trong đơn: `tien_hang` là đơn giá và `giam_gia` là mức giảm
 * trên 1 sản phẩm, nên tổng phải nhân `quantity`. Thành tiền của dòng = (tien_hang - giam_gia) * quantity.
 */
export const getCRMStats = unstable_cache(
  async (from?: Date, to?: Date, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COUNT(DISTINCT order_ID) AS totalOrders,
        COUNT(DISTINCT ${CUSTOMER_KEY_SQL}) AS totalCustomers,
        SUM(COALESCE(quantity, 0)) AS totalQuantity,
        SUM(COALESCE(tien_hang, 0) * COALESCE(quantity, 0)) AS totalTienHang,
        SUM(COALESCE(giam_gia, 0) * COALESCE(quantity, 0)) AS totalDiscount,
        SUM(COALESCE(thanh_tien, 0)) AS totalThanhTien,
        COUNT(DISTINCT CASE WHEN TRIM(status) = 'Hoàn thành' THEN order_ID END) AS completedOrders,
        SUM(CASE WHEN TRIM(status) = 'Hoàn thành' THEN COALESCE(thanh_tien, 0) ELSE 0 END) AS completedRevenue
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      `,
      params,
    );

    const row = rows[0] ?? {};

    return {
      totalOrders: Number(row.totalOrders) || 0,
      totalCustomers: Number(row.totalCustomers) || 0,
      totalQuantity: Number(row.totalQuantity) || 0,
      totalTienHang: Number(row.totalTienHang) || 0,
      totalDiscount: Number(row.totalDiscount) || 0,
      totalThanhTien: Number(row.totalThanhTien) || 0,
      completedOrders: Number(row.completedOrders) || 0,
      completedRevenue: Number(row.completedRevenue) || 0,
    };
  },
  ["crm-stats"],
  { revalidate: 300 },
);

export const getBrandConversionFunnel = unstable_cache(
  async (from?: Date, to?: Date, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(brand_pro, brand, 'Khong ro') AS brand,
        COUNT(DISTINCT order_ID) AS orders
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      GROUP BY COALESCE(brand_pro, brand, 'Khong ro')
      ORDER BY orders DESC
      LIMIT 10
      `,
      params,
    );

    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

    return (rows ?? []).map((row, index) => ({
      stage: String(row.brand ?? "Khong ro"),
      value: Number(row.orders) || 0,
      fill: colors[index % colors.length],
    }));
  },
  ["crm-brand-funnel"],
  { revalidate: 300 },
);

export const getChannelSalesSummary = unstable_cache(
  async (from?: Date, to?: Date, completedOnly = false, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);
    const completedFilter = completedOnly ? "AND TRIM(status) = 'Hoàn thành'" : "";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${CHANNEL_SQL} AS kenh_ban,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(quantity, 0)) AS quantity,
        SUM(COALESCE(tien_hang, 0) * COALESCE(quantity, 0)) AS tien_hang,
        SUM(COALESCE(giam_gia, 0) * COALESCE(quantity, 0)) AS giam_gia,
        SUM(COALESCE(thanh_tien, 0)) AS thanh_tien
      FROM ${legacyEacTables.orders}
      WHERE ${where}
        ${completedFilter}
      GROUP BY ${CHANNEL_SQL}
      ORDER BY thanh_tien DESC
      `,
      params,
    );

    return (rows ?? []).map((row) => ({
      kenh_ban: String(row.kenh_ban ?? "Chưa xác định"),
      order_count: Number(row.orders) || 0,
      quantity: Number(row.quantity) || 0,
      tien_hang: Number(row.tien_hang) || 0,
      giam_gia: Number(row.giam_gia) || 0,
      thanh_tien: Number(row.thanh_tien) || 0,
    }));
  },
  ["crm-channel-sales-summary"],
  { revalidate: 300 },
);

export const getTopProductsByQuantity = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 10, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(name_pro, 'Khong ro') AS product,
        SUM(COALESCE(quantity, 0)) AS totalQuantity,
        SUM(COALESCE(thanh_tien, 0)) AS totalRevenue
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      GROUP BY COALESCE(name_pro, 'Khong ro')
      ORDER BY totalQuantity DESC
      LIMIT ?
      `,
      [...params, limit],
    );

    const total = (rows ?? []).reduce((sum, row) => sum + (Number(row.totalQuantity) || 0), 0);

    return (rows ?? []).map((row) => {
      const quantity = Number(row.totalQuantity) || 0;

      return {
        product: String(row.product ?? "Khong ro"),
        quantity,
        revenue: Number(row.totalRevenue) || 0,
        percentage: total > 0 ? Math.round((quantity / total) * 100) : 0,
      };
    });
  },
  ["crm-top-products-quantity"],
  { revalidate: 300 },
);

export const getTopSalesByRevenue = unstable_cache(
  async (from?: Date, to?: Date, limit?: number, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);
    const normalizedLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
    const limitClause = normalizedLimit ? "LIMIT ?" : "";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(seller, 'Khong ro') AS seller,
        SUM(COALESCE(thanh_tien, 0)) AS totalRevenue,
        COUNT(DISTINCT order_ID) AS totalOrders
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      GROUP BY COALESCE(seller, 'Khong ro')
      ORDER BY totalRevenue DESC
      ${limitClause}
      `,
      normalizedLimit ? [...params, normalizedLimit] : params,
    );

    return (rows ?? []).map((row) => ({
      seller: String(row.seller ?? "Khong ro"),
      revenue: Number(row.totalRevenue) || 0,
      orders: Number(row.totalOrders) || 0,
    }));
  },
  ["crm-top-sales-revenue"],
  { revalidate: 300 },
);
