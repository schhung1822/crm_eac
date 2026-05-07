import { notFound } from "next/navigation";

import AdminTemplateEditor from "@/app/(admin)/admin/templates/[slug]/ui";
import { getSrxLadipageEventById, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";

import { LadipageEventNotFoundState, LadipageEventsSetupState } from "../../_components/ladipage-events-state";

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  if (!/^\d+$/.test(eventId)) {
    notFound();
  }

  let ladipageEvent: SrxLadipageEvent | null = null;

  try {
    ladipageEvent = await getSrxLadipageEventById(eventId);
  } catch (error) {
    return (
      <LadipageEventsSetupState
        message={error instanceof Error ? error.message : "Không thể tải cấu hình Ladipage sự kiện."}
      />
    );
  }

  if (!ladipageEvent) {
    return <LadipageEventNotFoundState identifier={eventId} />;
  }

  return (
    <AdminTemplateEditor
      slug={ladipageEvent.slug}
      initialName={ladipageEvent.name}
      initialConfig={ladipageEvent.config}
      editorTitle="Chỉnh sửa Ladipage sự kiện"
      publicBaseUrl={ladipageEvent.publicBaseUrl}
      publicPath={ladipageEvent.publicPath}
      redirectToEditBasePath="/srx/ladipage-events"
    />
  );
}
