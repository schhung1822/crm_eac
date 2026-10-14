/* eslint-disable complexity, max-lines */

import type { RowDataPacket } from "mysql2";

import { getSrxDB } from "@/lib/srx-db";
import { withSrxReadFallback } from "@/lib/srx-db-errors";

export type SrxDashboardDateRange = {
  from?: Date;
  to?: Date;
};

export type SrxDashboardSummary = {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  averageOrderValue: number;
  registeredOrderRate: number;
  repeatCustomers: number;
};

export type SrxDashboardOperationalMetric = {
  label: string;
  value: number;
  hint: string;
};

export type SrxDashboardPerformancePoint = {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  applications: number;
};

export type SrxDashboardStatusMetric = {
  label: string;
  count: number;
  revenue: number;
  fill: string;
};

export type SrxDashboardMixMetric = {
  label: string;
  count: number;
  revenue: number;
  fill: string;
};

export type SrxDashboardCategoryMetric = {
  label: string;
  count: number;
  fill: string;
};

export type SrxDashboardTopProduct = {
  name: string;
  soldCount: number;
  price: number;
  share: number;
};

export type SrxDashboardOrderSnapshot = {
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  total: number;
  placedAt: string;
};

export type SrxDashboardPostSnapshot = {
  title: string;
  categoryName: string;
  publishedAt: string;
};

export type SrxDashboardGranularity = "day" | "month";

export type SrxDashboardData = {
  /** true khi không đọc được CSDL SRX (mất kết nối hoặc thiếu bảng) và đang hiển thị dữ liệu rỗng. */
  unavailable: boolean;
  performanceGranularity: SrxDashboardGranularity;
  summary: SrxDashboardSummary;
  operations: SrxDashboardOperationalMetric[];
  performance: SrxDashboardPerformancePoint[];
  orderStatus: SrxDashboardStatusMetric[];
  customerMix: SrxDashboardMixMetric[];
  productCategories: SrxDashboardCategoryMetric[];
  contentCategories: SrxDashboardCategoryMetric[];
  affiliateStatus: SrxDashboardCategoryMetric[];
  topProducts: SrxDashboardTopProduct[];
  latestOrders: SrxDashboardOrderSnapshot[];
  recentPosts: SrxDashboardPostSnapshot[];
};

type CountRevenueRow = RowDataPacket & {
  label: string | null;
  count: number | null;
  revenue: number | null;
};

type CountRow = RowDataPacket & {
  label: string | null;
  count: number | null;
};

type DailyOrderRow = RowDataPacket & {
  date: string | null;
  orders: number | null;
  revenue: number | null;
};

type DailyCountRow = RowDataPacket & {
  date: string | null;
  total: number | null;
};

type SummaryRow = RowDataPacket & {
  total_orders: number | null;
  total_revenue: number | null;
  registered_orders: number | null;
};

type CustomerSummaryRow = RowDataPacket & {
  total_customers: number | null;
};

type RepeatCustomerRow = RowDataPacket & {
  repeat_customers: number | null;
};

type OperationsRow = RowDataPacket & {
  active_products: number | null;
  published_posts: number | null;
  active_affiliates: number | null;
  pending_applications: number | null;
  active_banners: number | null;
  active_vouchers: number | null;
  active_payment_methods: number | null;
  pending_orders: number | null;
};

type ProductRow = RowDataPacket & {
  name: string | null;
  sold_count: number | null;
  price: number | null;
};

type OrderSnapshotRow = RowDataPacket & {
  order_number: string | null;
  customer_name: string | null;
  order_status: string | null;
  payment_status: string | null;
  grand_total: number | null;
  placed_at_label: string | null;
};

type PostSnapshotRow = RowDataPacket & {
  title: string | null;
  category_name: string | null;
  published_at_label: string | null;
};

// Bảng màu mặc định của theme là thang xám nên các biểu đồ trạng thái dùng màu cố định theo ngữ nghĩa.
const chartPalette = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

const orderStatusColors: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  processing: "#6366f1",
  shipping: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#f43f5e",
  refunded: "#94a3b8",
};

const affiliateStatusColors: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#f43f5e",
};

const customerMixColors: Record<string, string> = {
  "Thành viên": "#6366f1",
  "Khách lẻ": "#94a3b8",
};

// Sau mốc này biểu đồ theo ngày quá dày nên gộp theo tháng.
const MAX_DAILY_POINTS = 92;

const orderStatusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  refunded: "Hoàn tiền",
};

// Số liệu thống kê doanh thu chỉ tính đơn đã hoàn tất và đã thanh toán.
const completedPaidOrderConditions = ["o.order_status = 'completed'", "o.payment_status = 'paid'"];

const affiliateApplicationStatusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
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

function buildWhereClause(
  baseConditions: string[],
  dateColumn: string | null,
  range: SrxDashboardDateRange,
): { clause: string; params: Array<Date | string> } {
  const conditions = [...baseConditions];
  const params: Array<Date | string> = [];

  if (dateColumn && range.from) {
    conditions.push(`${dateColumn} >= ?`);
    params.push(range.from);
  }

  if (dateColumn && range.to) {
    conditions.push(`${dateColumn} <= ?`);
    params.push(range.to);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function withColors<T extends { label: string }>(items: T[]): Array<T & { fill: string }> {
  return items.map((item, index) => ({
    ...item,
    fill: chartPalette[index % chartPalette.length],
  }));
}

function withFixedColors<T extends { label: string }>(
  items: T[],
  keys: string[],
  colors: Record<string, string>,
): Array<T & { fill: string }> {
  return items.map((item, index) => ({
    ...item,
    fill: new Map(Object.entries(colors)).get(keys.at(index) ?? "") ?? chartPalette[index % chartPalette.length],
  }));
}

function createEmptyDashboardData(): SrxDashboardData {
  return {
    unavailable: true,
    performanceGranularity: "day",
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      newCustomers: 0,
      averageOrderValue: 0,
      registeredOrderRate: 0,
      repeatCustomers: 0,
    },
    operations: [],
    performance: [],
    orderStatus: [],
    customerMix: [],
    productCategories: [],
    contentCategories: [],
    affiliateStatus: [],
    topProducts: [],
    latestOrders: [],
    recentPosts: [],
  };
}

function mergePerformanceSeries(
  orders: DailyOrderRow[],
  customers: DailyCountRow[],
  applications: DailyCountRow[],
): SrxDashboardPerformancePoint[] {
  const map = new Map<string, SrxDashboardPerformancePoint>();

  for (const row of orders) {
    const date = row.date ?? "";
    if (!date) {
      continue;
    }

    map.set(date, {
      date,
      revenue: asNumber(row.revenue),
      orders: asNumber(row.orders),
      customers: 0,
      applications: 0,
    });
  }

  for (const row of customers) {
    const date = row.date ?? "";
    if (!date) {
      continue;
    }

    const existing = map.get(date) ?? {
      date,
      revenue: 0,
      orders: 0,
      customers: 0,
      applications: 0,
    };
    existing.customers = asNumber(row.total);
    map.set(date, existing);
  }

  for (const row of applications) {
    const date = row.date ?? "";
    if (!date) {
      continue;
    }

    const existing = map.get(date) ?? {
      date,
      revenue: 0,
      orders: 0,
      customers: 0,
      applications: 0,
    };
    existing.applications = asNumber(row.total);
    map.set(date, existing);
  }

  return [...map.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptyPoint(date: string): SrxDashboardPerformancePoint {
  return { date, revenue: 0, orders: 0, customers: 0, applications: 0 };
}

/**
 * Chuẩn hoá chuỗi thời gian: điền các ngày không phát sinh dữ liệu bằng 0 để biểu đồ không nối sai xu hướng,
 * và gộp theo tháng khi khoảng thời gian quá dài.
 */
function normalizePerformanceSeries(points: SrxDashboardPerformancePoint[]): {
  series: SrxDashboardPerformancePoint[];
  granularity: SrxDashboardGranularity;
} {
  if (points.length === 0) {
    return { series: [], granularity: "day" };
  }

  const first = parseDay(points[0].date);
  const last = parseDay(points[points.length - 1].date);
  const spanDays = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;

  if (spanDays > MAX_DAILY_POINTS) {
    const months = new Map<string, SrxDashboardPerformancePoint>();

    for (const point of points) {
      const key = `${point.date.slice(0, 7)}-01`;
      const bucket = months.get(key) ?? emptyPoint(key);
      bucket.revenue += point.revenue;
      bucket.orders += point.orders;
      bucket.customers += point.customers;
      bucket.applications += point.applications;
      months.set(key, bucket);
    }

    // Điền cả các tháng trống nằm giữa.
    const series: SrxDashboardPerformancePoint[] = [];
    const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
    while (cursor <= last) {
      const key = formatDay(cursor);
      series.push(months.get(key) ?? emptyPoint(key));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return { series, granularity: "month" };
  }

  const byDate = new Map(points.map((point) => [point.date, point]));
  const series: SrxDashboardPerformancePoint[] = [];
  for (let cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = formatDay(cursor);
    series.push(byDate.get(key) ?? emptyPoint(key));
  }

  return { series, granularity: "day" };
}

export async function getSrxDashboardData(range: SrxDashboardDateRange = {}): Promise<SrxDashboardData> {
  return withSrxReadFallback("dashboard", createEmptyDashboardData(), async () => {
    const db = getSrxDB();

    const ordersWhere = buildWhereClause([], "o.placed_at", range);
    // Dùng cho các số liệu thống kê: chỉ đơn hoàn tất + đã thanh toán
    const paidOrdersWhere = buildWhereClause([...completedPaidOrderConditions], "o.placed_at", range);
    const customerWhere = buildWhereClause(["u.deleted_at IS NULL"], "u.created_at", range);
    const applicationWhere = buildWhereClause([], "aa.created_at", range);
    const postWhere = buildWhereClause(["p.status = 'published'"], "COALESCE(p.published_at, p.created_at)", range);

    const summaryRowsQuery = db.query<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(o.grand_total), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN o.user_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS registered_orders
        FROM orders o
        ${paidOrdersWhere.clause}
      `,
      paidOrdersWhere.params,
    );

    const customerSummaryRowsQuery = db.query<CustomerSummaryRow[]>(
      `
        SELECT COUNT(*) AS total_customers
        FROM users u
        ${customerWhere.clause}
      `,
      customerWhere.params,
    );

    const repeatWhere = buildWhereClause(
      ["o.user_id IS NOT NULL", ...completedPaidOrderConditions],
      "o.placed_at",
      range,
    );
    const repeatRowsQuery = db.query<RepeatCustomerRow[]>(
      `
        SELECT COUNT(*) AS repeat_customers
        FROM (
          SELECT o.user_id
          FROM orders o
          ${repeatWhere.clause}
          GROUP BY o.user_id
          HAVING COUNT(*) > 1
        ) repeated_customers
      `,
      repeatWhere.params,
    );

    const operationsRowsQuery = db.query<OperationsRow[]>(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'active') AS active_products,
        (SELECT COUNT(*) FROM posts WHERE status = 'published') AS published_posts,
        (SELECT COUNT(*) FROM affiliate_accounts WHERE status = 'active') AS active_affiliates,
        (SELECT COUNT(*) FROM affiliate_applications WHERE status = 'pending') AS pending_applications,
        (SELECT COUNT(*) FROM banners WHERE is_active = 1) AS active_banners,
        (SELECT COUNT(*) FROM discount_codes WHERE is_active = 1) AS active_vouchers,
        (SELECT COUNT(*) FROM payment_methods WHERE is_active = 1) AS active_payment_methods,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'pending') AS pending_orders
    `);

    const dailyOrderRowsQuery = db.query<DailyOrderRow[]>(
      `
        SELECT
          DATE_FORMAT(o.placed_at, '%Y-%m-%d') AS date,
          COUNT(*) AS orders,
          COALESCE(SUM(o.grand_total), 0) AS revenue
        FROM orders o
        ${paidOrdersWhere.clause}
        GROUP BY DATE_FORMAT(o.placed_at, '%Y-%m-%d')
        ORDER BY DATE_FORMAT(o.placed_at, '%Y-%m-%d') ASC
      `,
      paidOrdersWhere.params,
    );

    const dailyCustomerRowsQuery = db.query<DailyCountRow[]>(
      `
        SELECT
          DATE_FORMAT(u.created_at, '%Y-%m-%d') AS date,
          COUNT(*) AS total
        FROM users u
        ${customerWhere.clause}
        GROUP BY DATE_FORMAT(u.created_at, '%Y-%m-%d')
        ORDER BY DATE_FORMAT(u.created_at, '%Y-%m-%d') ASC
      `,
      customerWhere.params,
    );

    const dailyApplicationRowsQuery = db.query<DailyCountRow[]>(
      `
        SELECT
          DATE_FORMAT(aa.created_at, '%Y-%m-%d') AS date,
          COUNT(*) AS total
        FROM affiliate_applications aa
        ${applicationWhere.clause}
        GROUP BY DATE_FORMAT(aa.created_at, '%Y-%m-%d')
        ORDER BY DATE_FORMAT(aa.created_at, '%Y-%m-%d') ASC
      `,
      applicationWhere.params,
    );

    const orderStatusRowsQuery = db.query<CountRevenueRow[]>(
      `
        SELECT
          o.order_status AS label,
          COUNT(*) AS count,
          COALESCE(SUM(o.grand_total), 0) AS revenue
        FROM orders o
        ${ordersWhere.clause}
        GROUP BY o.order_status
        ORDER BY count DESC, revenue DESC
      `,
      ordersWhere.params,
    );

    const customerMixRowsQuery = db.query<CountRevenueRow[]>(
      `
        SELECT
          CASE
            WHEN o.user_id IS NULL THEN 'Khách lẻ'
            ELSE 'Thành viên'
          END AS label,
          COUNT(*) AS count,
          COALESCE(SUM(o.grand_total), 0) AS revenue
        FROM orders o
        ${paidOrdersWhere.clause}
        GROUP BY CASE WHEN o.user_id IS NULL THEN 'Khách lẻ' ELSE 'Thành viên' END
        ORDER BY count DESC, revenue DESC
      `,
      paidOrdersWhere.params,
    );

    const productCategoryRowsQuery = db.query<CountRow[]>(
      `
        SELECT
          COALESCE(pc.name, 'Chưa phân loại') AS label,
          COUNT(*) AS count
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.deleted_at IS NULL AND p.status = 'active'
        GROUP BY COALESCE(pc.name, 'Chưa phân loại')
        ORDER BY count DESC, label ASC
      `,
    );

    const contentCategoryRowsQuery = db.query<CountRow[]>(
      `
        SELECT
          ac.name AS label,
          COUNT(*) AS count
        FROM posts p
        INNER JOIN article_categories ac ON ac.id = p.category_id
        ${postWhere.clause}
        GROUP BY ac.name
        ORDER BY count DESC, ac.name ASC
      `,
      postWhere.params,
    );

    const affiliateStatusRowsQuery = db.query<CountRow[]>(
      `
        SELECT
          aa.status AS label,
          COUNT(*) AS count
        FROM affiliate_applications aa
        ${applicationWhere.clause}
        GROUP BY aa.status
        ORDER BY count DESC, aa.status ASC
      `,
      applicationWhere.params,
    );

    const topProductRowsQuery = db.query<ProductRow[]>(
      `
        SELECT
          p.name,
          p.sold_count,
          COALESCE(p.sale_price, p.base_price) AS price
        FROM products p
        WHERE p.deleted_at IS NULL AND p.status = 'active'
        ORDER BY p.sold_count DESC, p.view_count DESC, p.created_at DESC
        LIMIT 5
      `,
    );

    const latestOrderRowsQuery = db.query<OrderSnapshotRow[]>(
      `
        SELECT
          o.order_number,
          o.customer_name,
          o.order_status,
          o.payment_status,
          o.grand_total,
          DATE_FORMAT(o.placed_at, '%Y-%m-%d %H:%i') AS placed_at_label
        FROM orders o
        ${ordersWhere.clause}
        ORDER BY o.placed_at DESC, o.id DESC
        LIMIT 5
      `,
      ordersWhere.params,
    );

    const recentPostRowsQuery = db.query<PostSnapshotRow[]>(
      `
        SELECT
          p.title,
          ac.name AS category_name,
          DATE_FORMAT(COALESCE(p.published_at, p.created_at), '%Y-%m-%d') AS published_at_label
        FROM posts p
        INNER JOIN article_categories ac ON ac.id = p.category_id
        ${postWhere.clause}
        ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
        LIMIT 5
      `,
      postWhere.params,
    );

    // Các truy vấn độc lập nhau nên chạy song song thay vì chờ từng câu một.
    const [
      [summaryRows],
      [customerSummaryRows],
      [repeatRows],
      [operationsRows],
      [dailyOrderRows],
      [dailyCustomerRows],
      [dailyApplicationRows],
      [orderStatusRows],
      [customerMixRows],
      [productCategoryRows],
      [contentCategoryRows],
      [affiliateStatusRows],
      [topProductRows],
      [latestOrderRows],
      [recentPostRows],
    ] = await Promise.all([
      summaryRowsQuery,
      customerSummaryRowsQuery,
      repeatRowsQuery,
      operationsRowsQuery,
      dailyOrderRowsQuery,
      dailyCustomerRowsQuery,
      dailyApplicationRowsQuery,
      orderStatusRowsQuery,
      customerMixRowsQuery,
      productCategoryRowsQuery,
      contentCategoryRowsQuery,
      affiliateStatusRowsQuery,
      topProductRowsQuery,
      latestOrderRowsQuery,
      recentPostRowsQuery,
    ]);

    const summaryRow = summaryRows[0] ?? { total_orders: 0, total_revenue: 0, registered_orders: 0 };
    const customerSummaryRow = customerSummaryRows[0] ?? { total_customers: 0 };
    const repeatRow = repeatRows[0] ?? { repeat_customers: 0 };
    const operationsRow =
      operationsRows[0] ??
      ({
        active_products: 0,
        published_posts: 0,
        active_affiliates: 0,
        pending_applications: 0,
        active_banners: 0,
        active_vouchers: 0,
        active_payment_methods: 0,
        pending_orders: 0,
      } as OperationsRow);
    const totalOrders = asNumber(summaryRow.total_orders);
    const totalRevenue = asNumber(summaryRow.total_revenue);
    const registeredOrders = asNumber(summaryRow.registered_orders);

    const topProductTotal = topProductRows.reduce((sum, item) => sum + asNumber(item.sold_count), 0);

    const { series: performanceSeries, granularity: performanceGranularity } = normalizePerformanceSeries(
      mergePerformanceSeries(dailyOrderRows, dailyCustomerRows, dailyApplicationRows),
    );

    return {
      unavailable: false,
      performanceGranularity,
      summary: {
        totalRevenue,
        totalOrders,
        newCustomers: asNumber(customerSummaryRow.total_customers),
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        registeredOrderRate: totalOrders > 0 ? (registeredOrders / totalOrders) * 100 : 0,
        repeatCustomers: asNumber(repeatRow.repeat_customers),
      },
      operations: [
        {
          label: "Đơn chờ xử lý",
          value: asNumber(operationsRow.pending_orders),
          hint: "Cần follow trạng thái fulfilment",
        },
        {
          label: "Sản phẩm active",
          value: asNumber(operationsRow.active_products),
          hint: "Danh mục đang bán trên website",
        },
        {
          label: "Bài viết published",
          value: asNumber(operationsRow.published_posts),
          hint: "Nội dung đang hiển thị công khai",
        },
        {
          label: "Affiliate active",
          value: asNumber(operationsRow.active_affiliates),
          hint: "Tài khoản đang đủ điều kiện cộng tác",
        },
        {
          label: "Hồ sơ chờ duyệt",
          value: asNumber(operationsRow.pending_applications),
          hint: "Backlog approval của affiliate",
        },
        {
          label: "Ưu đãi đang chạy",
          value: asNumber(operationsRow.active_vouchers) + asNumber(operationsRow.active_banners),
          hint: `${asNumber(operationsRow.active_vouchers)} voucher + ${asNumber(operationsRow.active_banners)} banner`,
        },
        {
          label: "Thanh toán active",
          value: asNumber(operationsRow.active_payment_methods),
          hint: "Số phương thức thanh toán đang bật",
        },
      ],
      performance: performanceSeries,
      orderStatus: withFixedColors(
        orderStatusRows.map((row) => ({
          label: orderStatusLabels[row.label ?? ""] ?? String(row.label ?? "Khác"),
          count: asNumber(row.count),
          revenue: asNumber(row.revenue),
        })),
        orderStatusRows.map((row) => row.label ?? ""),
        orderStatusColors,
      ),
      customerMix: withFixedColors(
        customerMixRows.map((row) => ({
          label: String(row.label ?? "Khác"),
          count: asNumber(row.count),
          revenue: asNumber(row.revenue),
        })),
        customerMixRows.map((row) => String(row.label ?? "")),
        customerMixColors,
      ),
      productCategories: withColors(
        productCategoryRows.map((row) => ({
          label: String(row.label ?? "Khác"),
          count: asNumber(row.count),
        })),
      ),
      contentCategories: withColors(
        contentCategoryRows.map((row) => ({
          label: String(row.label ?? "Khác"),
          count: asNumber(row.count),
        })),
      ),
      affiliateStatus: withFixedColors(
        affiliateStatusRows.map((row) => ({
          label: affiliateApplicationStatusLabels[row.label ?? ""] ?? String(row.label ?? "Khác"),
          count: asNumber(row.count),
        })),
        affiliateStatusRows.map((row) => row.label ?? ""),
        affiliateStatusColors,
      ),
      topProducts: topProductRows.map((row) => ({
        name: String(row.name ?? "Không tên"),
        soldCount: asNumber(row.sold_count),
        price: asNumber(row.price),
        share: topProductTotal > 0 ? (asNumber(row.sold_count) / topProductTotal) * 100 : 0,
      })),
      latestOrders: latestOrderRows.map((row) => ({
        orderNumber: String(row.order_number ?? ""),
        customerName: String(row.customer_name ?? "Khách hàng"),
        orderStatus: orderStatusLabels[row.order_status ?? ""] ?? String(row.order_status ?? "Khác"),
        paymentStatus: String(row.payment_status ?? "pending"),
        total: asNumber(row.grand_total),
        placedAt: String(row.placed_at_label ?? ""),
      })),
      recentPosts: recentPostRows.map((row) => ({
        title: String(row.title ?? "Không tiêu đề"),
        categoryName: String(row.category_name ?? "Khác"),
        publishedAt: String(row.published_at_label ?? ""),
      })),
    };
  });
}
