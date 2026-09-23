import { unstable_cache } from "next/cache";

import type { RowDataPacket } from "mysql2";

import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

type DailySalesTrendRow = RowDataPacket & {
  date: string | null;
  orders: number | string | null;
  revenue: number | string | null;
};

type OrderStatusSummaryRow = RowDataPacket & {
  status: string | null;
  orders: number | string | null;
  revenue: number | string | null;
};

function buildDateFilter(from: Date, to: Date) {
  return {
    clause: "create_time >= ? AND create_time <= ?",
    params: [from, to],
  };
}

export const getDailySalesTrend = unstable_cache(
  async (from: Date, to: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<DailySalesTrendRow[]>(
      `
      SELECT
        DATE_FORMAT(create_time, '%Y-%m-%d') AS date,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM ${legacyEacTables.orders}
      WHERE ${dateFilter.clause}
        AND TRIM(status) = 'Hoàn thành'
      GROUP BY DATE_FORMAT(create_time, '%Y-%m-%d')
      ORDER BY date
      `,
      dateFilter.params,
    );

    return rows.map((row) => ({
      date: String(row.date ?? ""),
      orders: Number(row.orders) || 0,
      revenue: Number(row.revenue) || 0,
    }));
  },
  ["default-dashboard-daily-sales-trend"],
  { revalidate: 300 },
);

export const getOrderStatusSummary = unstable_cache(
  async (from: Date, to: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<OrderStatusSummaryRow[]>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(status), ''), 'Chưa xác định') AS status,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM ${legacyEacTables.orders}
      WHERE ${dateFilter.clause}
      GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'Chưa xác định')
      ORDER BY orders DESC
      `,
      dateFilter.params,
    );

    return rows.map((row) => ({
      status: String(row.status ?? "Chưa xác định"),
      orders: Number(row.orders) || 0,
      revenue: Number(row.revenue) || 0,
    }));
  },
  ["default-dashboard-order-status-summary"],
  { revalidate: 300 },
);
