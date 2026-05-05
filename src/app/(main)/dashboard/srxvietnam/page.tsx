import { getSrxDashboardData } from "@/lib/srx-dashboard";

import SrxVietnamDashboardShell from "./_components/srx-vietnam-dashboard-shell";

export const dynamic = "force-dynamic";

function parseDateParam(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to);

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  const data = await getSrxDashboardData({ from, to });

  return <SrxVietnamDashboardShell data={data} />;
}
