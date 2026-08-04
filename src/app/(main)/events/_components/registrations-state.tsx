export function RegistrationsSetupState({ message }: { message: string }) {
  return (
    <div className="max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
      <h1 className="text-xl font-semibold">Chưa đọc được lượt đăng ký sự kiện</h1>
      <p className="mt-3 text-sm leading-6">{message}</p>
      <p className="mt-3 text-sm leading-6">
        Lượt đăng ký từ Ladipage được ghi vào bảng <code>checkin</code> của database SRX (cùng database với{" "}
        <code>ladipage_events</code>). Hãy kiểm tra biến môi trường <code>SRX_DB_*</code> và import{" "}
        <code>sql/srx_ladipage_events_tables.sql</code>.
      </p>
    </div>
  );
}
