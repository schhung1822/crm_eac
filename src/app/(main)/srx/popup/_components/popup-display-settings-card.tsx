"use client";

import * as React from "react";

import { Home, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  parseSrxWebsitePopupSettingsState,
  type SrxWebsitePopupFrequency,
  type SrxWebsitePopupSettings,
  type SrxWebsitePopupSettingsState,
  type SrxWebsitePopupTrigger,
} from "@/lib/srx-website-popup.shared";

const triggerOptions: { value: SrxWebsitePopupTrigger; label: string }[] = [
  { value: "delay", label: "Sau một khoảng thời gian" },
  { value: "scroll", label: "Khi khách cuộn trang" },
  { value: "exit_intent", label: "Khi khách định rời trang" },
];

const frequencyOptions: { value: SrxWebsitePopupFrequency; label: string }[] = [
  { value: "every_visit", label: "Mỗi lần vào trang chủ" },
  { value: "once_per_session", label: "Một lần mỗi phiên truy cập" },
  { value: "once_per_days", label: "Một lần trong số ngày chọn" },
];

function toSettings(state: SrxWebsitePopupSettingsState): SrxWebsitePopupSettings {
  const { updated_at: _updatedAt, ...settings } = state;
  return settings;
}

function NumberField({
  id,
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value || 0))}
          className="w-28"
        />
        <span className="text-muted-foreground text-sm">{suffix}</span>
      </div>
    </div>
  );
}

function TriggerFields({
  form,
  onChange,
}: {
  form: SrxWebsitePopupSettings;
  onChange: (patch: Partial<SrxWebsitePopupSettings>) => void;
}) {
  if (form.trigger === "scroll") {
    return (
      <NumberField
        id="popup-scroll-percent"
        label="Hiện khi cuộn tới"
        min={1}
        max={100}
        suffix="% chiều dài trang"
        value={form.scroll_percent}
        onChange={(value) => onChange({ scroll_percent: value })}
      />
    );
  }

  return (
    <div className="grid gap-2">
      <NumberField
        id="popup-delay-seconds"
        label={form.trigger === "exit_intent" ? "Trên điện thoại, hiện sau" : "Hiện sau"}
        min={0}
        max={600}
        suffix="giây kể từ khi vào trang"
        value={form.delay_seconds}
        onChange={(value) => onChange({ delay_seconds: value })}
      />
      {form.trigger === "exit_intent" ? (
        <p className="text-muted-foreground text-xs leading-5">
          Trên máy tính, popup hiện khi chuột đưa lên thanh địa chỉ/đóng tab. Điện thoại không có thao tác này nên dùng
          thời gian chờ ở trên.
        </p>
      ) : null}
    </div>
  );
}

export function PopupDisplaySettingsCard({ initialSettings }: { initialSettings: SrxWebsitePopupSettingsState }) {
  const [form, setForm] = React.useState<SrxWebsitePopupSettings>(() => toSettings(initialSettings));
  const [updatedAt, setUpdatedAt] = React.useState(initialSettings.updated_at);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleChange = (patch: Partial<SrxWebsitePopupSettings>) => setForm((current) => ({ ...current, ...patch }));

  async function handleSave() {
    try {
      setIsSaving(true);

      const response = await fetch("/api/srx/website-popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu cấu hình popup");
      }

      const saved = parseSrxWebsitePopupSettingsState(result.settings);
      setForm(toSettings(saved));
      setUpdatedAt(saved.updated_at);
      toast.success("Đã lưu cấu hình popup trang chủ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình popup");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="size-4" />
          Popup ở trang chủ
        </CardTitle>
        <CardDescription>Tự bật lên khi khách vào trang chủ, theo cách và tần suất bên dưới.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        <label className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Hiển thị popup ở trang chủ</span>
            <span className="text-muted-foreground text-xs">Tắt thì trang chủ không hiện popup nữa.</span>
          </span>
          <Switch
            checked={form.homepage_enabled}
            onCheckedChange={(checked) => handleChange({ homepage_enabled: checked })}
          />
        </label>

        <fieldset disabled={!form.homepage_enabled} className="grid gap-5 disabled:opacity-60">
          <div className="grid gap-2">
            <Label htmlFor="popup-trigger">Cách xuất hiện</Label>
            <Select
              value={form.trigger}
              onValueChange={(value) => handleChange({ trigger: value as SrxWebsitePopupTrigger })}
              disabled={!form.homepage_enabled}
            >
              <SelectTrigger id="popup-trigger" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TriggerFields form={form} onChange={handleChange} />

          <div className="grid gap-2">
            <Label htmlFor="popup-frequency">Tần suất hiện lại với cùng một khách</Label>
            <Select
              value={form.frequency}
              onValueChange={(value) => handleChange({ frequency: value as SrxWebsitePopupFrequency })}
              disabled={!form.homepage_enabled}
            >
              <SelectTrigger id="popup-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.frequency === "once_per_days" ? (
            <NumberField
              id="popup-frequency-days"
              label="Hiện lại sau"
              min={1}
              max={365}
              suffix="ngày"
              value={form.frequency_days}
              onChange={(value) => handleChange({ frequency_days: value })}
            />
          ) : null}

          <NumberField
            id="popup-auto-slide"
            label="Tự chuyển ảnh sau"
            min={0}
            max={60}
            suffix="giây (0 = không tự chuyển)"
            value={form.auto_slide_seconds}
            onChange={(value) => handleChange({ auto_slide_seconds: value })}
          />
        </fieldset>

        <p className="text-muted-foreground text-xs leading-5">
          Sau mỗi lần lưu, khách đã đóng popup trước đó sẽ được xem lại theo cấu hình mới.
        </p>
      </CardContent>

      <CardFooter className="justify-between gap-3 border-t">
        <span className="text-muted-foreground text-xs">
          {updatedAt ? `Lưu lần cuối: ${updatedAt.toLocaleString("vi-VN")}` : "Chưa lưu cấu hình"}
        </span>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          <Save className="size-4" />
          {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </CardFooter>
    </Card>
  );
}
