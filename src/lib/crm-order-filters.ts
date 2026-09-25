import { buildSegmentClause, type CrmSegment } from "@/lib/crm-segments";

/** Khóa nhận diện khách hàng trên đơn: ưu tiên mã khách, không có thì dùng số điện thoại. */
export const CUSTOMER_KEY_SQL = "COALESCE(NULLIF(TRIM(customer_ID), ''), NULLIF(TRIM(phone), ''))";
export const CHANNEL_SQL = "COALESCE(NULLIF(TRIM(kenh_ban), ''), 'Chưa xác định')";

export function buildDateFilter(from?: Date, to?: Date) {
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

/** Ghép điều kiện thời gian + phân khúc kênh bán thành mệnh đề WHERE. */
export function buildWhere(from?: Date, to?: Date, segment?: CrmSegment) {
  const dateFilter = buildDateFilter(from, to);
  const segmentFilter = buildSegmentClause(segment);
  const clauses = [dateFilter.clause, segmentFilter.clause].filter(Boolean);

  return {
    where: clauses.length > 0 ? clauses.join(" AND ") : "1=1",
    params: [...dateFilter.params, ...segmentFilter.params] as (Date | number | string)[],
  };
}
