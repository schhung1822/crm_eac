import { getMetaDatasetEventLogs, getMetaDatasetEventStats } from "@/lib/meta-conversions";

import { MetaEventsManager } from "./_components/meta-events-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, stats] = await Promise.all([getMetaDatasetEventLogs(), getMetaDatasetEventStats()]);

  return <MetaEventsManager initialEvents={events} stats={stats} />;
}
