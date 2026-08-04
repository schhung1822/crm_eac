import { getSrxLadipageEvents, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";
import { getSrxLadipageRegistrationCounts } from "@/lib/srx-ladipage-registrations";

import { LadipageEventsManager } from "./_components/ladipage-events-manager";
import { LadipageEventsSetupState } from "./_components/ladipage-events-state";

export default async function Page() {
  let events: SrxLadipageEvent[] = [];
  let registrationCounts: Record<string, number> = {};

  try {
    [events, registrationCounts] = await Promise.all([getSrxLadipageEvents(), getSrxLadipageRegistrationCounts()]);
  } catch (error) {
    return (
      <LadipageEventsSetupState
        message={error instanceof Error ? error.message : "Không thể tải danh sách Ladipage sự kiện."}
      />
    );
  }

  return <LadipageEventsManager initialEvents={events} registrationCounts={registrationCounts} />;
}
