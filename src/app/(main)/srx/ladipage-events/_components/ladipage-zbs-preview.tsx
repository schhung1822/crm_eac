import type { SrxLadipageZbsTemplateData } from "@/lib/srx-ladipage-zbs.shared";

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 py-1.5">
      <span className="text-[#6b7280]">{label}</span>
      <span className="min-w-0 font-medium break-words text-[#111827]">{children}</span>
    </div>
  );
}

/**
 * Xem trước tin ZBS mẫu "Đăng ký sự kiện" (641012) như trên Zalo.
 * Luôn nền sáng như tin thật, không đổi theo giao diện tối của CRM.
 */
export function LadipageZbsPreview({ data }: { data: SrxLadipageZbsTemplateData }) {
  return (
    <div className="rounded-xl bg-[#eef1f8] p-4">
      <div className="mx-auto max-w-[380px] rounded-xl bg-white p-4 text-[13px] leading-5 text-[#374151] shadow-sm">
        <div className="flex items-end gap-1 text-[#111827]">
          <span className="text-3xl leading-none font-black tracking-tight">EAC</span>
          <span className="pb-0.5 text-[10px] font-semibold tracking-[0.5em]">GROUP</span>
        </div>

        <div className="mt-3 text-[15px] font-semibold text-[#111827]">Đăng ký thành công</div>

        <p className="mt-2">
          Chào <b className="text-[#111827]">{data.customer_name || "<customer_name>"}</b>, cảm ơn bạn đã đăng ký tham
          gia <b className="text-[#111827]">{data.event_name || "<event_name>"}</b>.
        </p>
        <p className="mt-2">Dưới đây là thông tin chi tiết:</p>

        <div className="mt-1">
          <PreviewRow label="Mã đăng ký">{data.code}</PreviewRow>
          <PreviewRow label="Thời gian">{data.event_time}</PreviewRow>
          <PreviewRow label="Địa điểm">{data.event_location || "<event_location>"}</PreviewRow>
          <PreviewRow label="Hình thức">{data.event_format || "<event_format>"}</PreviewRow>
          <PreviewRow label="Trạng thái">
            <span className="inline-flex rounded-full bg-[#dcfce7] px-2 py-0.5 text-[#15803d]">{data.status}</span>
          </PreviewRow>
        </div>

        <p className="mt-2">Chúng tôi sẽ thông báo cho bạn nếu có cập nhật liên quan đến chương trình.</p>
        <p className="mt-2">Cảm ơn bạn đã đồng hành cùng chương trình của chúng tôi.</p>

        <div className="mt-3 rounded-lg bg-[#0068ff] py-2 text-center font-semibold text-white">Liên hệ OA</div>
      </div>
    </div>
  );
}
