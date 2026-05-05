import AdminTemplateEditor from "@/app/(admin)/admin/templates/[slug]/ui";
import {
  ensureDefaultSrxLadipageEvent,
  getActiveSrxLadipageEvent,
  getSrxLadipageEventBySlug,
  type SrxLadipageEvent,
} from "@/lib/srx-ladipage-events";

type SearchParams = Promise<{
  slug?: string;
}>;

function MissingSetupState({ message }: { message: string }) {
  return (
    <div className="max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
      <h1 className="text-xl font-semibold">Thiếu cấu hình database cho Ladipage sự kiện</h1>
      <p className="mt-3 text-sm leading-6">{message}</p>
      <p className="mt-3 text-sm leading-6">
        Hãy import file <code>sql/srx_ladipage_events_tables.sql</code> vào database SRX rồi tải lại trang này.
      </p>
    </div>
  );
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div className="border-border bg-card max-w-3xl rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Không tìm thấy Ladipage sự kiện</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        Không có bản ghi nào với slug <code>{slug}</code>.
      </p>
    </div>
  );
}

async function loadLadipageEvent(
  requestedSlug: string,
): Promise<{ errorMessage: string | null; ladipageEvent: SrxLadipageEvent | null }> {
  try {
    await ensureDefaultSrxLadipageEvent();

    const ladipageEvent =
      requestedSlug === "edit" ? await getActiveSrxLadipageEvent() : await getSrxLadipageEventBySlug(requestedSlug);

    return {
      errorMessage: null,
      ladipageEvent,
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : "Không thể tải cấu hình Ladipage sự kiện.",
      ladipageEvent: null,
    };
  }
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedSlug = params.slug?.trim() ?? "edit";
  const { errorMessage, ladipageEvent } = await loadLadipageEvent(requestedSlug);

  if (errorMessage) {
    return <MissingSetupState message={errorMessage} />;
  }

  if (!ladipageEvent) {
    return <NotFoundState slug={requestedSlug} />;
  }

  return (
    <AdminTemplateEditor
      slug={ladipageEvent.slug}
      initialName={ladipageEvent.name}
      initialConfig={ladipageEvent.config}
      editorTitle="Chỉnh sửa Ladipage sự kiện"
      publicBaseUrl={ladipageEvent.publicBaseUrl}
      publicPath={ladipageEvent.publicPath}
    />
  );
}
