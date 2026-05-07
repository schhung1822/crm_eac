export function LadipageEventsSetupState({ message }: { message: string }) {
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

export function LadipageEventNotFoundState({ identifier }: { identifier: string }) {
  return (
    <div className="border-border bg-card max-w-3xl rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Không tìm thấy Ladipage sự kiện</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        Không có bản ghi nào với mã <code>{identifier}</code>.
      </p>
    </div>
  );
}
