import { CRMB2cDashboardShell } from "../_components/reports/crm-dashboard-shell";
import { loadB2cDashboard, parseDateRange } from "../_components/reports/load-crm-dashboard";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from, to } = parseDateRange(await searchParams);
  const data = await loadB2cDashboard(from, to);

  return <CRMB2cDashboardShell {...data} />;
}
