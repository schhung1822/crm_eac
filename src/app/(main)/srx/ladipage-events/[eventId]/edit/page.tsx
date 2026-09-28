import { notFound } from "next/navigation";

import { MessageSquareText } from "lucide-react";

import AdminTemplateEditor from "@/app/(admin)/admin/templates/[slug]/ui";
import { getSrxLadipageEventById, type SrxLadipageEvent } from "@/lib/srx-ladipage-events";
import { getSrxLadipageZbsLogs, getSrxLadipageZbsSettings } from "@/lib/srx-ladipage-zbs";
import { parseSrxLadipageZbsSettings } from "@/lib/srx-ladipage-zbs.shared";

import { LadipageEventNotFoundState, LadipageEventsSetupState } from "../../_components/ladipage-events-state";
import { LadipageZbsPanel } from "../../_components/ladipage-zbs-panel";

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

  const [savedZbsSettings, zbsLogs] = await Promise.all([
    getSrxLadipageZbsSettings(eventId),
    getSrxLadipageZbsLogs(eventId),
  ]);
  // Chưa lưu lần nào: gợi ý sẵn tên và địa điểm từ nội dung trang sự kiện.
  const zbsSettings =
    savedZbsSettings ??
    parseSrxLadipageZbsSettings({
      event_name: ladipageEvent.config.behavior.eventName.slice(0, 200),
      event_location: ladipageEvent.config.footer.placeName.slice(0, 200),
    });

  return (
    <AdminTemplateEditor
      slug={ladipageEvent.slug}
      initialName={ladipageEvent.name}
      initialConfig={ladipageEvent.config}
      initialStatus={ladipageEvent.status}
      editorTitle="Chỉnh sửa Ladipage sự kiện"
      publicBaseUrl={ladipageEvent.publicBaseUrl}
      publicPath={ladipageEvent.publicPath}
      redirectToEditBasePath="/srx/ladipage-events"
      extraTabs={[
        {
          value: "zbs",
          label: "ZBS",
          icon: <MessageSquareText />,
          content: <LadipageZbsPanel eventId={eventId} initialSettings={zbsSettings} initialLogs={zbsLogs} />,
        },
      ]}
    />
  );
}
