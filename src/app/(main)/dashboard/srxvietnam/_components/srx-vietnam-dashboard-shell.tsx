import type { SrxDashboardData } from "@/lib/srx-dashboard";

import SrxVietnamDashboardClient from "./srx-vietnam-dashboard-client";

export default function SrxVietnamDashboardShell({ data }: { data: SrxDashboardData }) {
  return <SrxVietnamDashboardClient data={data} />;
}
