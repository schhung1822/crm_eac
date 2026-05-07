import { getSrxLadipageEvents, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";

import { LadipageEventsManager } from "./_components/ladipage-events-manager";
import { LadipageEventsSetupState } from "./_components/ladipage-events-state";

export default async function Page() {
  let events: SrxLadipageEvent[] = [];

  try {
    events = await getSrxLadipageEvents();
  } catch (error) {
    return (
      <LadipageEventsSetupState
        message={error instanceof Error ? error.message : "Không thể tải danh sách Ladipage sự kiện."}
      />
    );
  }

  return <LadipageEventsManager initialEvents={events} />;
}
