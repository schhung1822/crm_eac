"use client";

import * as React from "react";

import { History, Loader2, MessageSquareText, RefreshCw, Save, Send, Settings2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Field, Section } from "@/app/(admin)/admin/templates/[slug]/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  buildSrxLadipageZbsTemplateData,
  parseSrxLadipageZbsLog,
  srxLadipageZbsParamLimits,
  SRX_LADIPAGE_ZBS_STATUS_TEXT,
  type SrxLadipageZbsLog,
  type SrxLadipageZbsSettings,
} from "@/lib/srx-ladipage-zbs.shared";

import { LadipageZbsLogs } from "./ladipage-zbs-logs";
import { LadipageZbsPreview } from "./ladipage-zbs-preview";

const SAMPLE_CUSTOMER_NAME = "Nguyễn Văn A";
const SAMPLE_CODE = "SK7F3K9Q";
const eventFormatSuggestions = ["Online", "Offline", "Trực tiếp", "Online & Offline"];

const autoParams = [
  { name: "customer_name", source: "Họ và tên khách điền trong form" },
  { name: "phone", source: "SĐT đăng ký, chuẩn hoá về dạng 84xxxxxxxxx" },
  { name: "status", source: `Luôn là "${SRX_LADIPAGE_ZBS_STATUS_TEXT}"` },
  { name: "code", source: "Mã đăng ký ngẫu nhiên, không trùng (VD: SK7F3K9Q)" },
  { name: "event_time", source: "Thời gian đăng ký lưu trong SQL, giữ nguyên (HH:mm:ss dd/MM/yyyy)" },
];

function formatSampleTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof result?.message === "string" ? result.message : "Yêu cầu thất bại");
  }

  return result;
}

function TestSendForm({
  disabledReason,
  eventId,
  onSent,
}: {
  disabledReason: string;
  eventId: string;
  onSent: () => void;
}) {
  const [phone, setPhone] = React.useState("");
  const [customerName, setCustomerName] = React.useState(SAMPLE_CUSTOMER_NAME);
  const [isSending, setIsSending] = React.useState(false);

  async function handleSend() {
    try {
      setIsSending(true);
      const result = await requestJson(`/api/srx/ladipage-events/${eventId}/zbs/test`, {
        method: "POST",
        body: JSON.stringify({ phone, customer_name: customerName }),
      });
      toast.success(result.message ?? "Đã gửi tin thử");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi thử ZBS");
    } finally {
      setIsSending(false);
      onSent();
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-4">
      <div className="text-sm font-medium">Gửi thử tới số của bạn</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Số điện thoại nhận">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="09xx xxx xxx"
            inputMode="tel"
          />
        </Field>
        <Field label="Tên hiển thị">
          <Input
            value={customerName}
            maxLength={srxLadipageZbsParamLimits.customer_name}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={isSending || !phone.trim() || Boolean(disabledReason)}
          onClick={() => void handleSend()}
        >
          {isSending ? <Loader2 className="animate-spin" /> : <Send />}
          Gửi thử
        </Button>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        {disabledReason || "Dùng cấu hình đã lưu. Tin thử vẫn bị Zalo tính phí như tin thật."}
      </p>
    </div>
  );
}

export function LadipageZbsPanel({
  eventId,
  initialLogs,
  initialSettings,
}: {
  eventId: string;
  initialLogs: SrxLadipageZbsLog[];
  initialSettings: SrxLadipageZbsSettings;
}) {
  const [form, setForm] = React.useState(initialSettings);
  const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(initialSettings));
  const [isSaving, setIsSaving] = React.useState(false);
  const [logs, setLogs] = React.useState(initialLogs);
  const [isRefreshingLogs, setIsRefreshingLogs] = React.useState(false);
  const sampleTime = React.useMemo(() => formatSampleTime(new Date()), []);
  const isDirty = JSON.stringify(form) !== savedSnapshot;

  const previewData = buildSrxLadipageZbsTemplateData({
    code: SAMPLE_CODE,
    customerName: SAMPLE_CUSTOMER_NAME,
    eventFormat: form.event_format,
    eventLocation: form.event_location,
    eventName: form.event_name,
    eventTime: sampleTime,
  });

  const update = (patch: Partial<SrxLadipageZbsSettings>) => setForm((current) => ({ ...current, ...patch }));

  async function refreshLogs() {
    try {
      setIsRefreshingLogs(true);
      const result = await requestJson(`/api/srx/ladipage-events/${eventId}/zbs`);
      setLogs((result.logs as unknown[]).map(parseSrxLadipageZbsLog));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải nhật ký ZBS");
    } finally {
      setIsRefreshingLogs(false);
    }
  }

  async function handleSave() {
    if (form.enabled && (!form.event_name.trim() || !form.event_location.trim() || !form.event_format.trim())) {
      toast.error("Nhập đủ tên sự kiện, địa điểm và hình thức trước khi bật gửi ZBS.");
      return;
    }

    try {
      setIsSaving(true);
      const result = await requestJson(`/api/srx/ladipage-events/${eventId}/zbs`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm(result.settings);
      setSavedSnapshot(JSON.stringify(result.settings));
      toast.success(form.enabled ? "Đã lưu. Khách đăng ký mới sẽ nhận ZBS." : "Đã lưu. Đang tắt gửi ZBS.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình ZBS");
    } finally {
      setIsSaving(false);
    }
  }

  const saveButton = (
    <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
      {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
      {isSaving ? "Đang lưu..." : "Lưu cấu hình ZBS"}
    </Button>
  );

  return (
    <>
      <Section
        title="Gửi ZBS xác nhận đăng ký"
        description="Tự động gửi mẫu ZBS tới SĐT của khách ngay khi có lượt đăng ký mới. Lưu riêng, áp dụng ngay, không cần xuất bản trang."
        icon={MessageSquareText}
        action={saveButton}
      >
        <div className="grid gap-4">
          <label className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <span className="grid gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                Bật gửi ZBS
                <Badge variant={form.enabled ? "default" : "secondary"}>{form.enabled ? "Đang bật" : "Đang tắt"}</Badge>
                {isDirty ? <Badge variant="outline">Chưa lưu</Badge> : null}
              </span>
              <span className="text-muted-foreground text-xs">
                Gửi bằng access_token &quot;zalo_eac&quot; trong bảng token.
              </span>
            </span>
            <Switch checked={form.enabled} onCheckedChange={(checked) => update({ enabled: checked })} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Tên sự kiện (event_name)"
              className="md:col-span-2"
              hint={`${form.event_name.length}/${srxLadipageZbsParamLimits.event_name} ký tự`}
            >
              <Input
                value={form.event_name}
                maxLength={srxLadipageZbsParamLimits.event_name}
                onChange={(event) => update({ event_name: event.target.value })}
              />
            </Field>
            <Field
              label="Địa điểm (event_location)"
              hint={`${form.event_location.length}/${srxLadipageZbsParamLimits.event_location} ký tự`}
            >
              <Input
                value={form.event_location}
                maxLength={srxLadipageZbsParamLimits.event_location}
                onChange={(event) => update({ event_location: event.target.value })}
                placeholder="VD: Trực tuyến qua Zoom"
              />
            </Field>
            <Field
              label="Hình thức (event_format)"
              hint={`${form.event_format.length}/${srxLadipageZbsParamLimits.event_format} ký tự`}
            >
              <Input
                value={form.event_format}
                maxLength={srxLadipageZbsParamLimits.event_format}
                onChange={(event) => update({ event_format: event.target.value })}
                list="zbs-event-format-options"
                placeholder="VD: Online"
              />
              <datalist id="zbs-event-format-options">
                {eventFormatSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field
              label="ID mẫu ZBS"
              hint="Mẫu “Đăng ký sự kiện” của OA EAC Group. Chỉ đổi khi dùng mẫu khác cùng tham số."
            >
              <Input
                value={form.template_id}
                inputMode="numeric"
                onChange={(event) => update({ template_id: event.target.value.replace(/\D/g, "") })}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Tham số tự động" description="Lấy từ từng lượt đăng ký, không cần cấu hình." icon={Wand2}>
        <div className="divide-y rounded-lg border">
          {autoParams.map((param) => (
            <div key={param.name} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
              <code className="text-primary font-mono text-xs leading-5">&lt;{param.name}&gt;</code>
              <span className="text-muted-foreground">{param.source}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Tin sẽ được gửi"
        description="Xem trước với khách hàng mẫu. Tin thật dùng tên, mã và thời gian của từng lượt đăng ký."
        icon={Settings2}
      >
        <div className="grid gap-4">
          <LadipageZbsPreview data={previewData} />
          <TestSendForm
            eventId={eventId}
            disabledReason={isDirty ? "Lưu cấu hình trước khi gửi thử." : ""}
            onSent={() => void refreshLogs()}
          />
        </div>
      </Section>

      <Section
        title="Nhật ký gửi"
        description="30 tin gần nhất của sự kiện này."
        icon={History}
        action={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void refreshLogs()}
            disabled={isRefreshingLogs}
          >
            <RefreshCw className={isRefreshingLogs ? "animate-spin" : undefined} />
            Làm mới
          </Button>
        }
      >
        <LadipageZbsLogs logs={logs} />
      </Section>
    </>
  );
}
