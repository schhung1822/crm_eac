import { getSrxLadipageEvents, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";
import { getSrxLadipageRegistrations, type SrxLadipageRegistration } from "@/lib/srx-ladipage-registrations";

import { RegistrationsManager, type RegistrationEventOption } from "./_components/registrations-manager";
import { RegistrationsSetupState } from "./_components/registrations-state";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const selectedSlug = event?.trim() ?? "";

  let registrations: SrxLadipageRegistration[] = [];
  let ladipageEvents: SrxLadipageEvent[] = [];

  try {
    [registrations, ladipageEvents] = await Promise.all([
      getSrxLadipageRegistrations(selectedSlug),
      getSrxLadipageEvents(),
    ]);
  } catch (error) {
    return (
      <RegistrationsSetupState
        message={error instanceof Error ? error.message : "Không thể tải danh sách lượt đăng ký."}
      />
    );
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
      <RegistrationsManager registrations={registrations} eventOptions={eventOptions} selectedSlug={selectedSlug} />
    </div>
  );
}
