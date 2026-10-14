import { getSrxDashboardData } from "@/lib/srx-dashboard";

import SrxVietnamDashboardShell from "./_components/srx-vietnam-dashboard-shell";

export const dynamic = "force-dynamic";

// Đọc yyyy-MM-dd theo giờ địa phương của server để mốc ngày không bị lệch do múi giờ UTC.
function parseDateParam(value?: string): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  let from = parseDateParam(params.from);
  let to = parseDateParam(params.to);

  // Đảo lại nếu người dùng nhập ngược khoảng thời gian.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  if (from) {
    from.setHours(0, 0, 0, 0);
  }

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  const data = await getSrxDashboardData({ from, to });

  return <SrxVietnamDashboardShell data={data} />;
}
