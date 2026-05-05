import { unstable_cache } from "next/cache";

import {
  buildRevenueHorizontalBars,
  buildRevenuePie,
  type RevenueGroupRow,
} from "@/app/(main)/dashboard/crm/_components/crm.config";
import { getDB } from "@/lib/db";

type ChartResult = ReturnType<typeof buildRevenuePie>;

function mapRows(rows: any[]): RevenueGroupRow[] {
  return (rows ?? []).map((row) => ({
    name: String(row.name ?? "Khong ro"),
    revenue: Number(row.revenue) || 0,
  }));
}

function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return { clause: "", params: [] as (Date | number)[] };

  const params: (Date | number)[] = [];
  let clause = "";

  if (from && to) {
    clause = "create_time >= ? AND create_time <= ?";
    params.push(from, to);
  } else if (from) {
    clause = "create_time >= ?";
    params.push(from);
  } else if (to) {
    clause = "create_time <= ?";
    params.push(to);
  }

  return { clause, params };
}

export const getRevenueByChannelChart = unstable_cache(
  async (from?: Date, to?: Date): Promise<ChartResult> => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT COALESCE(kenh_ban, 'Khong ro') AS name,
             SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM orders
      WHERE ${whereClause}
      GROUP BY COALESCE(kenh_ban, 'Khong ro')
      ORDER BY revenue DESC
      `,
      dateFilter.params,
    );

    return buildRevenuePie(mapRows(rows), "Doanh thu");
  },
  ["crm-revenue-by-channel"],
  { revalidate: 300 },
);

export const getRevenueByBranchBarChart = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 12) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT COALESCE(brand, 'Khong ro') AS name,
             SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM orders
      WHERE ${whereClause}
      GROUP BY COALESCE(brand, 'Khong ro')
      ORDER BY revenue DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    const mapped: RevenueGroupRow[] = (rows ?? []).map((row) => ({
      name: String(row.name ?? "Khong ro"),
      revenue: Number(row.revenue) || 0,
    }));

    return buildRevenueHorizontalBars(mapped);
  },
  ["crm-revenue-branch-bars"],
  { revalidate: 300 },
);

export const getCRMStats = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COUNT(DISTINCT order_ID) AS totalOrders,
        SUM(COALESCE(quantity, 0)) AS totalQuantity,
        SUM(COALESCE(tien_hang, 0)) AS totalTienHang,
        SUM(COALESCE(thanh_tien, 0)) AS totalThanhTien
      FROM orders
      WHERE ${whereClause}
      `,
      dateFilter.params,
    );

    const row = rows[0] ?? {};

    return {
      totalOrders: Number(row.totalOrders) || 0,
      totalQuantity: Number(row.totalQuantity) || 0,
      totalTienHang: Number(row.totalTienHang) || 0,
      totalThanhTien: Number(row.totalThanhTien) || 0,
    };
  },
  ["crm-stats"],
  { revalidate: 300 },
);

export const getBrandConversionFunnel = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(o.brand_pro, o.brand, 'Khong ro') AS brand,
        COUNT(DISTINCT o.order_ID) AS orders
      FROM orders o
      WHERE ${whereClause.replace("create_time", "o.create_time")}
      GROUP BY COALESCE(o.brand_pro, o.brand, 'Khong ro')
      ORDER BY orders DESC
      LIMIT 5
      `,
      dateFilter.params,
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
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(kenh_ban, 'Khong ro') AS kenh_ban,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(quantity, 0)) AS quantity,
        SUM(COALESCE(tien_hang, 0) * COALESCE(quantity, 0)) AS tien_hang,
        SUM(COALESCE(giam_gia, 0)) AS giam_gia,
        SUM(COALESCE(thanh_tien, 0)) AS thanh_tien
      FROM orders
      WHERE ${whereClause}
      GROUP BY COALESCE(kenh_ban, 'Khong ro')
      ORDER BY thanh_tien DESC
      `,
      dateFilter.params,
    );

    return (rows ?? []).map((row) => ({
      kenh_ban: String(row.kenh_ban ?? "Khong ro"),
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
  async (from?: Date, to?: Date, limit: number = 10) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(name_pro, 'Khong ro') AS product,
        SUM(COALESCE(quantity, 0)) AS totalQuantity
      FROM orders
      WHERE ${whereClause}
      GROUP BY COALESCE(name_pro, 'Khong ro')
      ORDER BY totalQuantity DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    const total = (rows ?? []).reduce((sum, row) => sum + (Number(row.totalQuantity) || 0), 0);

    return (rows ?? []).map((row) => {
      const quantity = Number(row.totalQuantity) || 0;

      return {
        product: String(row.product ?? "Khong ro"),
        quantity,
        percentage: total > 0 ? Math.round((quantity / total) * 100) : 0,
      };
    });
  },
  ["crm-top-products-quantity"],
  { revalidate: 300 },
);

export const getTopSalesByRevenue = unstable_cache(
  async (from?: Date, to?: Date, limit?: number) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);
    const whereClause = dateFilter.clause || "1=1";
    const normalizedLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
    const limitClause = normalizedLimit ? "LIMIT ?" : "";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(seller, 'Khong ro') AS seller,
        SUM(COALESCE(thanh_tien, 0)) AS totalRevenue,
        COUNT(DISTINCT order_ID) AS totalOrders
      FROM orders
      WHERE ${whereClause}
      GROUP BY COALESCE(seller, 'Khong ro')
      ORDER BY totalRevenue DESC
      ${limitClause}
      `,
      normalizedLimit ? [...dateFilter.params, normalizedLimit] : dateFilter.params,
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
