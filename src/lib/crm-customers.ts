import type { RowDataPacket } from "mysql2";

import { getDB } from "@/lib/db";

export type CrmCustomerDistribution = {
  label: string;
  value: number;
  fill: string;
};

export type CrmCustomerTrendPoint = {
  period: string;
  customers: number;
};

export type CrmVipCustomer = {
  name: string;
  branch: string;
  company: string;
  totalRevenue: number;
  lastPayment: string;
};

export type CrmCustomerInsights = {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    companyCustomers: number;
    dormantCustomers: number;
  };
  branchDistribution: CrmCustomerDistribution[];
  classDistribution: CrmCustomerDistribution[];
  recencyDistribution: CrmCustomerDistribution[];
  createdTrend: CrmCustomerTrendPoint[];
  topCustomers: CrmVipCustomer[];
};

type SummaryRow = RowDataPacket & {
  totalCustomers?: number | null;
  activeCustomers?: number | null;
  companyCustomers?: number | null;
  dormantCustomers?: number | null;
};

type DistributionRow = RowDataPacket & {
  label?: string | null;
  count?: number | null;
};

type TrendRow = RowDataPacket & {
  period?: string | null;
  customers?: number | null;
};

type VipCustomerRow = RowDataPacket & {
  name?: string | null;
  branch?: string | null;
  company?: string | null;
  totalRevenue?: number | null;
  lastPayment?: string | null;
};

const chartPalette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const recencyPalette: Record<string, string> = {
  "0-30 ngày": "var(--chart-2)",
  "31-90 ngày": "var(--chart-1)",
  "91-180 ngày": "var(--chart-4)",
  ">180 ngày": "var(--chart-5)",
  "Chưa giao dịch": "var(--muted-foreground)",
};

function asNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function buildDateFilter(column: string, from?: Date, to?: Date) {
  if (!from && !to) {
    return { clause: "", params: [] as Date[] };
  }

  if (from && to) {
    return {
      clause: `WHERE ${column} >= ? AND ${column} <= ?`,
      params: [from, to],
    };
  }

  if (from) {
    return {
      clause: `WHERE ${column} >= ?`,
      params: [from],
    };
  }

  return {
    clause: `WHERE ${column} <= ?`,
    params: [to as Date],
  };
}

function withColors(
  items: Array<{ label: string; value: number }>,
  colorMap?: Record<string, string>,
): CrmCustomerDistribution[] {
  return items.map((item, index) => ({
    ...item,
    fill: colorMap?.[item.label] ?? chartPalette[index % chartPalette.length],
  }));
}

function groupRest(items: Array<{ label: string; value: number }>, limit: number, otherLabel = "Khác") {
  if (items.length <= limit) {
    return items;
  }

  const visibleItems = items.slice(0, Math.max(limit - 1, 1));
  const remainingValue = items.slice(Math.max(limit - 1, 1)).reduce((sum, item) => sum + item.value, 0);

  return [...visibleItems, { label: otherLabel, value: remainingValue }];
}

function createEmptyInsights(): CrmCustomerInsights {
  return {
    summary: {
      totalCustomers: 0,
      activeCustomers: 0,
      companyCustomers: 0,
      dormantCustomers: 0,
    },
    branchDistribution: [],
    classDistribution: [],
    recencyDistribution: [],
    createdTrend: [],
    topCustomers: [],
  };
}

export async function getCrmCustomerInsights(from?: Date, to?: Date): Promise<CrmCustomerInsights> {
  const db = getDB();
  const referenceDate = (to ?? new Date()).toISOString().slice(0, 10);
  const trendFilter = buildDateFilter("create_time", from, to);
  const trendWhereClause = trendFilter.clause || "WHERE create_time IS NOT NULL";

  const [summaryRows] = await db.query<SummaryRow[]>(
    `
      SELECT
        COUNT(*) AS totalCustomers,
        SUM(
          CASE
            WHEN last_payment IS NOT NULL AND DATEDIFF(?, DATE(last_payment)) <= 30 THEN 1
            ELSE 0
          END
        ) AS activeCustomers,
        SUM(
          CASE
            WHEN company IS NOT NULL AND TRIM(company) <> '' THEN 1
            ELSE 0
          END
        ) AS companyCustomers,
        SUM(
          CASE
            WHEN last_payment IS NULL OR DATEDIFF(?, DATE(last_payment)) > 120 THEN 1
            ELSE 0
          END
        ) AS dormantCustomers
      FROM customer
    `,
    [referenceDate, referenceDate],
  );

  const [branchRows] = await db.query<DistributionRow[]>(
    `
      SELECT
        COALESCE(NULLIF(TRIM(branch), ''), 'Không rõ') AS label,
        COUNT(*) AS count
      FROM customer
      GROUP BY COALESCE(NULLIF(TRIM(branch), ''), 'Không rõ')
      ORDER BY count DESC, label ASC
    `,
  );

  const [classRows] = await db.query<DistributionRow[]>(
    `
      SELECT
        COALESCE(NULLIF(TRIM(class), ''), 'Chưa phân hạng') AS label,
        COUNT(*) AS count
      FROM customer
      GROUP BY COALESCE(NULLIF(TRIM(class), ''), 'Chưa phân hạng')
      ORDER BY count DESC, label ASC
    `,
  );

  const [recencyRows] = await db.query<DistributionRow[]>(
    `
      SELECT
        CASE
          WHEN last_payment IS NULL THEN 'Chưa giao dịch'
          WHEN DATEDIFF(?, DATE(last_payment)) <= 30 THEN '0-30 ngày'
          WHEN DATEDIFF(?, DATE(last_payment)) <= 90 THEN '31-90 ngày'
          WHEN DATEDIFF(?, DATE(last_payment)) <= 180 THEN '91-180 ngày'
          ELSE '>180 ngày'
        END AS label,
        COUNT(*) AS count
      FROM customer
      GROUP BY label
      ORDER BY FIELD(label, '0-30 ngày', '31-90 ngày', '91-180 ngày', '>180 ngày', 'Chưa giao dịch')
    `,
    [referenceDate, referenceDate, referenceDate],
  );

  const [trendRows] = await db.query<TrendRow[]>(
    `
      SELECT
        DATE_FORMAT(create_time, '%Y-%m') AS period,
        COUNT(*) AS customers
      FROM customer
      ${trendWhereClause}
      GROUP BY DATE_FORMAT(create_time, '%Y-%m')
      ORDER BY period DESC
      LIMIT 12
    `,
    trendFilter.params,
  );

  const [topCustomerRows] = await db.query<VipCustomerRow[]>(
    `
      SELECT
        COALESCE(NULLIF(TRIM(name), ''), 'Khách hàng chưa đặt tên') AS name,
        COALESCE(NULLIF(TRIM(branch), ''), 'Không rõ') AS branch,
        COALESCE(NULLIF(TRIM(company), ''), '') AS company,
        COALESCE(tong_ban_tru_tra_hang, 0) AS totalRevenue,
        COALESCE(DATE_FORMAT(last_payment, '%d/%m/%Y'), 'Chưa giao dịch') AS lastPayment
      FROM customer
      ORDER BY COALESCE(tong_ban_tru_tra_hang, 0) DESC, COALESCE(tong_ban, 0) DESC, name ASC
      LIMIT 25
    `,
  );

  if (
    summaryRows.length === 0 &&
    branchRows.length === 0 &&
    classRows.length === 0 &&
    recencyRows.length === 0 &&
    trendRows.length === 0 &&
    topCustomerRows.length === 0
  ) {
    return createEmptyInsights();
  }

  const summary = summaryRows[0] ?? {};
  const branchDistribution = withColors(
    groupRest(
      branchRows.map((row) => ({
        label: normalizeLabel(row.label, "Không rõ"),
        value: asNumber(row.count),
      })),
      6,
    ),
  );

  const classDistribution = withColors(
    groupRest(
      classRows.map((row) => ({
        label: normalizeLabel(row.label, "Chưa phân hạng"),
        value: asNumber(row.count),
      })),
      6,
    ),
  );

  const recencyDistribution = withColors(
    recencyRows.map((row) => ({
      label: normalizeLabel(row.label, "Chưa giao dịch"),
      value: asNumber(row.count),
    })),
    recencyPalette,
  );

  return {
    summary: {
      totalCustomers: asNumber(summary.totalCustomers),
      activeCustomers: asNumber(summary.activeCustomers),
      companyCustomers: asNumber(summary.companyCustomers),
      dormantCustomers: asNumber(summary.dormantCustomers),
    },
    branchDistribution,
    classDistribution,
    recencyDistribution,
    createdTrend: [...trendRows]
      .reverse()
      .map((row) => ({
        period: normalizeLabel(row.period, ""),
        customers: asNumber(row.customers),
      }))
      .filter((row) => row.period !== ""),
    topCustomers: topCustomerRows.map((row) => ({
      name: normalizeLabel(row.name, "Khách hàng chưa đặt tên"),
      branch: normalizeLabel(row.branch, "Không rõ"),
      company: normalizeLabel(row.company, "Cá nhân"),
      totalRevenue: asNumber(row.totalRevenue),
      lastPayment: normalizeLabel(row.lastPayment, "Chưa giao dịch"),
    })),
  };
}
