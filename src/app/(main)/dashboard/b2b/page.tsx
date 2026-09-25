import { CRMB2bDashboardShell } from "../_components/reports/crm-dashboard-shell";
import { loadB2bDashboard, parseDateRange } from "../_components/reports/load-crm-dashboard";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from, to } = parseDateRange(await searchParams);
  const data = await loadB2bDashboard(from, to);

  return <CRMB2bDashboardShell {...data} />;
}
