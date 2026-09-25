import { CustomerDashboardShell } from "../_components/reports/crm-dashboard-shell";
import { loadCustomerDashboard, parseDateRange } from "../_components/reports/load-crm-dashboard";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from, to } = parseDateRange(await searchParams);
  const data = await loadCustomerDashboard(from, to);

  return <CustomerDashboardShell {...data} />;
}
