"use client";

import * as React from "react";

import { Save, Settings2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  parseSrxLuckyWheelSettingsState,
  type SrxLuckyWheelSettings,
  type SrxLuckyWheelSettingsState,
} from "@/lib/srx-lucky-wheel.shared";

import { LuckyWheelZbsFields } from "./lucky-wheel-zbs-fields";

function toSettings(state: SrxLuckyWheelSettingsState): SrxLuckyWheelSettings {
  const { updated_at: _updatedAt, ...settings } = state;
  return settings;
}

function SwitchRow({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs leading-5">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
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

export function LuckyWheelSettingsCard({ initialSettings }: { initialSettings: SrxLuckyWheelSettingsState }) {
  const [form, setForm] = React.useState<SrxLuckyWheelSettings>(() => toSettings(initialSettings));
  const [updatedAt, setUpdatedAt] = React.useState(initialSettings.updated_at);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleChange = (patch: Partial<SrxLuckyWheelSettings>) => setForm((current) => ({ ...current, ...patch }));

  async function handleSave() {
    try {
      setIsSaving(true);

      const response = await fetch("/api/srx/lucky-wheel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu cấu hình vòng quay");
      }

      const saved = parseSrxLuckyWheelSettingsState(result.settings);
      setForm(toSettings(saved));
      setUpdatedAt(saved.updated_at);
      toast.success("Đã lưu cấu hình vòng quay");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu cấu hình vòng quay");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="size-4" />
          Cấu hình chung
        </CardTitle>
        <CardDescription>
          Nút vòng quay hiện ở góc phải dưới trên mọi trang của website khi được bật và có ít nhất một phần thưởng.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        <SwitchRow
          label="Bật vòng quay may mắn"
          description="Tắt thì website ẩn nút và khách không quay được nữa. Lượt quay còn lại vẫn được giữ."
          checked={form.enabled}
          onCheckedChange={(checked) => handleChange({ enabled: checked })}
        />

        <div className="grid gap-2">
          <Label htmlFor="lucky-wheel-title">Tiêu đề</Label>
          <Input
            id="lucky-wheel-title"
            maxLength={80}
            value={form.title}
            onChange={(event) => handleChange({ title: event.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="lucky-wheel-description">Mô tả ngắn</Label>
          <Textarea
            id="lucky-wheel-description"
            maxLength={300}
            rows={2}
            value={form.description}
            placeholder="VD: Quay là trúng – voucher đến 200K và quà tặng độc quyền từ SRX."
            onChange={(event) => handleChange({ description: event.target.value })}
          />
        </div>

        <div className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" />
            Giới thiệu bạn bè
          </div>
          <p className="text-muted-foreground text-xs leading-5">
            Mỗi khách đã đăng nhập có một link riêng. Người mở link rồi tạo tài khoản mới trên cùng trình duyệt được
            tính cho người giới thiệu. Ngoài ra mỗi tài khoản luôn được 1 lượt khi đăng nhập.
          </p>

          <SwitchRow
            label="Cho phép nhận lượt quay qua giới thiệu"
            description="Hiện link giới thiệu trong popup vòng quay."
            checked={form.referral_enabled}
            onCheckedChange={(checked) => handleChange({ referral_enabled: checked })}
          />

          <fieldset disabled={!form.referral_enabled} className="grid gap-4 disabled:opacity-60">
            <SwitchRow
              label="Bạn được giới thiệu phải đăng nhập bằng Zalo"
              description="Chỉ cộng lượt khi bạn được mời đã từng đăng nhập bằng Zalo (QR hoặc Mini App). Bật để mỗi lượt ứng với một tài khoản Zalo thật, chống tạo tài khoản ảo bằng email."
              checked={form.referral_requires_activation}
              onCheckedChange={(checked) => handleChange({ referral_requires_activation: checked })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="lucky-wheel-referral-spins"
                label="Cộng cho người giới thiệu"
                min={1}
                max={10}
                suffix="lượt / bạn"
                value={form.referral_spins}
                onChange={(value) => handleChange({ referral_spins: value })}
              />
              <NumberField
                id="lucky-wheel-referral-max"
                label="Tối đa từ giới thiệu"
                min={0}
                max={1000}
                suffix="lượt (0 = không giới hạn)"
                value={form.referral_max_spins}
                onChange={(value) => handleChange({ referral_max_spins: value })}
              />
            </div>
          </fieldset>
        </div>

        <LuckyWheelZbsFields value={form} onChange={handleChange} />

        <div className="grid gap-2">
          <Label htmlFor="lucky-wheel-terms">Thể lệ chương trình</Label>
          <Textarea
            id="lucky-wheel-terms"
            maxLength={3000}
            rows={5}
            value={form.terms}
            placeholder="Thời gian, điều kiện nhận thưởng, cách liên hệ nhận quà..."
            onChange={(event) => handleChange({ terms: event.target.value })}
          />
          <p className="text-muted-foreground text-xs">Hiện ở cuối popup, khách bấm “Thể lệ chương trình” để xem.</p>
        </div>
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
