import { unstable_cache } from "next/cache";

import { addDays, addMonths, differenceInCalendarDays, format, startOfDay, startOfMonth } from "date-fns";

import { buildDateFilter, buildWhere, CHANNEL_SQL, CUSTOMER_KEY_SQL } from "@/lib/crm-order-filters";
import { buildSegmentClause, type CrmSegment } from "@/lib/crm-segments";
import { getDB } from "@/lib/db";
import { legacyEacTables } from "@/lib/legacy-db";

export type RevenueTrendGranularity = "day" | "month";

export type RevenueTrendPoint = {
  period: string;
  revenue: number;
  orders: number;
  byChannel: Record<string, number>;
  ordersByChannel: Record<string, number>;
};

export type RevenueTrend = {
  granularity: RevenueTrendGranularity;
  channels: string[];
  points: RevenueTrendPoint[];
};

/** Liệt kê đủ các mốc (ngày/tháng) trong khoảng để biểu đồ không bị hụt điểm. */
function listPeriods(start: Date, end: Date, granularity: RevenueTrendGranularity) {
  const periods: string[] = [];

  if (granularity === "day") {
    for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, 1)) {
      periods.push(format(cursor, "yyyy-MM-dd"));
    }
  } else {
    for (let cursor = startOfMonth(start); cursor <= end; cursor = addMonths(cursor, 1)) {
      periods.push(format(cursor, "yyyy-MM"));
    }
  }

  return periods;
}

function parsePeriod(period: string, granularity: RevenueTrendGranularity) {
  return new Date(granularity === "day" ? `${period}T00:00:00` : `${period}-01T00:00:00`);
}

function emptyPoint(period: string): RevenueTrendPoint {
  return { period, revenue: 0, orders: 0, byChannel: {}, ordersByChannel: {} };
}

function addToPoint(point: RevenueTrendPoint, channel: string, revenue: number, orders: number) {
  point.revenue += revenue;
  point.orders += orders;
  point.byChannel[channel] = (point.byChannel[channel] ?? 0) + revenue;
  point.ordersByChannel[channel] = (point.ordersByChannel[channel] ?? 0) + orders;
}

/** Gom các dòng (mốc thời gian × kênh) thành điểm theo mốc, kèm tổng doanh thu từng kênh. */
function aggregateTrendRows(rows: any[]) {
  const pointsByPeriod = new Map<string, RevenueTrendPoint>();
  const channelTotals = new Map<string, number>();

  for (const row of rows) {
    const period = String(row.period ?? "");
    if (!period) continue;

    const channel = String(row.channel ?? "Chưa xác định");
    const revenue = Number(row.revenue) || 0;
    const point = pointsByPeriod.get(period) ?? emptyPoint(period);

    addToPoint(point, channel, revenue, Number(row.orders) || 0);
    pointsByPeriod.set(period, point);
    channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + revenue);
  }

  return {
    pointsByPeriod,
    channels: [...channelTotals.entries()].sort((a, b) => b[1] - a[1]).map(([channel]) => channel),
  };
}

export const getRevenueTrend = unstable_cache(
  async (from?: Date, to?: Date, segment?: CrmSegment): Promise<RevenueTrend> => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);
    const granularity: RevenueTrendGranularity =
      from && to && differenceInCalendarDays(to, from) <= 92 ? "day" : "month";
    const periodFormat = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        DATE_FORMAT(create_time, '${periodFormat}') AS period,
        ${CHANNEL_SQL} AS channel,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM ${legacyEacTables.orders}
      WHERE ${where}
        AND create_time IS NOT NULL
      GROUP BY period, channel
      ORDER BY period
      `,
      params,
    );

    const { pointsByPeriod, channels } = aggregateTrendRows(rows);
    const knownPeriods = [...pointsByPeriod.keys()].sort();
    const start = from ?? (knownPeriods.length > 0 ? parsePeriod(knownPeriods[0], granularity) : undefined);
    const periods = start ? listPeriods(start, to ?? new Date(), granularity) : knownPeriods;

    return {
      granularity,
      channels,
      points: periods.map((period) => pointsByPeriod.get(period) ?? emptyPoint(period)),
    };
  },
  ["crm-revenue-trend"],
  { revalidate: 300 },
);

export const getOrderStatusBreakdown = unstable_cache(
  async (from?: Date, to?: Date, segment?: CrmSegment) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(status), ''), 'Chưa xác định') AS status,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
      FROM ${legacyEacTables.orders}
      WHERE ${where}
      GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'Chưa xác định')
      ORDER BY orders DESC
      `,
      params,
    );

    return rows.map((row) => ({
      status: String(row.status ?? "Chưa xác định"),
      orders: Number(row.orders) || 0,
      revenue: Number(row.revenue) || 0,
    }));
  },
  ["crm-order-status-breakdown"],
  { revalidate: 300 },
);

export const getTopCustomersByRevenue = unstable_cache(
  async (
    from?: Date,
    to?: Date,
    segment?: CrmSegment,
    limit: number = 10,
    sortBy: "revenue" | "orders" = "revenue",
  ) => {
    const db = getDB();
    const { where, params } = buildWhere(from, to, segment);
    const orderBy = sortBy === "orders" ? "orders DESC, revenue DESC" : "revenue DESC";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${CUSTOMER_KEY_SQL} AS customerKey,
        MAX(NULLIF(TRIM(name_customer), '')) AS name,
        MAX(NULLIF(TRIM(phone), '')) AS phone,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(thanh_tien, 0)) AS revenue,
        DATE_FORMAT(MAX(create_time), '%d/%m/%Y') AS lastOrder
      FROM ${legacyEacTables.orders}
      WHERE ${where}
        AND ${CUSTOMER_KEY_SQL} IS NOT NULL
      GROUP BY customerKey
      ORDER BY ${orderBy}
      LIMIT ?
      `,
      [...params, limit],
    );

    return rows.map((row) => ({
      name: String(row.name ?? row.customerKey ?? "Khách hàng chưa đặt tên"),
      phone: String(row.phone ?? ""),
      orders: Number(row.orders) || 0,
      revenue: Number(row.revenue) || 0,
      lastOrder: String(row.lastOrder ?? ""),
    }));
  },
  ["crm-top-customers-revenue"],
  { revalidate: 300 },
);

/**
 * Khách mua trong kỳ: tổng số, khách mới (đơn đầu tiên trong phân khúc rơi vào kỳ này)
 * và khách mua lặp lại (từ 2 đơn trở lên trong kỳ).
 */
export const getCustomerRetention = unstable_cache(
  async (from?: Date, to?: Date, segment?: CrmSegment) => {
    const db = getDB();
    const segmentFilter = buildSegmentClause(segment);
    const rangeFilter = buildDateFilter(from, to);
    const inRange = rangeFilter.clause || "1=1";
    const innerWhere = [segmentFilter.clause, to ? "create_time <= ?" : "", `${CUSTOMER_KEY_SQL} IS NOT NULL`]
      .filter(Boolean)
      .join(" AND ");
    const newCustomerExpr = from ? "SUM(CASE WHEN t.firstOrder >= ? THEN 1 ELSE 0 END)" : "COUNT(*)";

    // Thứ tự tham số khớp thứ tự dấu ? trong câu SQL: SELECT ngoài → CASE bên trong → WHERE bên trong.
    const [rows] = await db.query<any[]>(
      `
      SELECT
        COUNT(*) AS customers,
        SUM(CASE WHEN t.ordersInRange >= 2 THEN 1 ELSE 0 END) AS repeatCustomers,
        ${newCustomerExpr} AS newCustomers
      FROM (
        SELECT
          ${CUSTOMER_KEY_SQL} AS customerKey,
          COUNT(DISTINCT CASE WHEN ${inRange} THEN order_ID END) AS ordersInRange,
          MIN(create_time) AS firstOrder
        FROM ${legacyEacTables.orders}
        WHERE ${innerWhere}
        GROUP BY customerKey
      ) t
      WHERE t.ordersInRange > 0
      `,
      [...(from ? [from] : []), ...rangeFilter.params, ...segmentFilter.params, ...(to ? [to] : [])],
    );

    const row = rows[0] ?? {};
    const customers = Number(row.customers) || 0;
    const newCustomers = Number(row.newCustomers) || 0;

    return {
      customers,
      newCustomers,
      returningCustomers: Math.max(customers - newCustomers, 0),
      repeatCustomers: Number(row.repeatCustomers) || 0,
    };
  },
  ["crm-customer-retention"],
  { revalidate: 300 },
);
