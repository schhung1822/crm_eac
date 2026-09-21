import { getSrxLadipageEvents, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";
import {
  getSrxLadipageRegistrationCounts,
  getSrxLadipageRegistrations,
  type SrxLadipageRegistration,
} from "@/lib/srx-ladipage-registrations";
import { getSrxLadipageVisitsReport, type SrxLadipageVisitsReport } from "@/lib/srx-ladipage-visits";

import { LadipageVisitDashboard } from "./_components/ladipage-visit-dashboard";
import { RegistrationsManager, type RegistrationEventOption } from "./_components/registrations-manager";
import { RegistrationsSetupState } from "./_components/registrations-state";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const selectedSlug = event?.trim() ?? "";

  let registrations: SrxLadipageRegistration[] = [];
  let ladipageEvents: SrxLadipageEvent[] = [];
  let registrationCounts: Record<string, number> = {};

  try {
    [registrations, ladipageEvents, registrationCounts] = await Promise.all([
      getSrxLadipageRegistrations(selectedSlug),
      getSrxLadipageEvents(),
      getSrxLadipageRegistrationCounts(),
    ]);
  } catch (error) {
    return (
      <RegistrationsSetupState
        message={error instanceof Error ? error.message : "Không thể tải danh sách lượt đăng ký."}
      />
    );
  }

  let visitsReport: SrxLadipageVisitsReport | null = null;
  let visitsError = "";
  try {
    visitsReport = await getSrxLadipageVisitsReport();
  } catch (error) {
    console.error("Failed to load Ladipage visit statistics:", error);
    visitsError = "Không thể tải thống kê truy cập từ database SRX.";
  }

  const eventOptions: RegistrationEventOption[] = ladipageEvents.map((ladipageEvent) => ({
    id: ladipageEvent.id,
    slug: ladipageEvent.slug,
    name: ladipageEvent.name,
    eventName: ladipageEvent.eventName,
    status: ladipageEvent.status,
  }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <LadipageVisitDashboard
        eventOptions={eventOptions}
        selectedSlug={selectedSlug}
        report={visitsReport}
        error={visitsError}
        registrationCounts={registrationCounts}
      />
      <RegistrationsManager registrations={registrations} eventOptions={eventOptions} selectedSlug={selectedSlug} />
    </div>
  );
}
