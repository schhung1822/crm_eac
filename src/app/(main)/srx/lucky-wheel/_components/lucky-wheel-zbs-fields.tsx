"use client";

import * as React from "react";

import { MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SrxLuckyWheelSettings } from "@/lib/srx-lucky-wheel.shared";

type ZbsSettings = Pick<SrxLuckyWheelSettings, "zbs_enabled" | "zbs_template_id" | "zbs_token_name">;

function ZbsTestSender({ disabled }: { disabled: boolean }) {
  const [phone, setPhone] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  async function handleSend() {
    try {
      setIsSending(true);

      const response = await fetch("/api/srx/lucky-wheel/zbs-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể gửi tin thử");
      }

      toast.success(result.message ?? "Đã gửi tin thử");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi tin thử");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="lucky-wheel-zbs-test-phone">Gửi thử (mã mẫu 12345678, theo cấu hình đã lưu)</Label>
      <div className="flex gap-2">
        <Input
          id="lucky-wheel-zbs-test-phone"
          inputMode="tel"
          placeholder="Số điện thoại nhận tin thử"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isSending || !phone.trim()}
          onClick={() => void handleSend()}
        >
          <Send className="size-4" />
          {isSending ? "Đang gửi..." : "Gửi thử"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs leading-5">Mỗi tin gửi thử được Zalo tính phí như tin thật.</p>
    </div>
  );
}

/** Gửi mã voucher trúng thưởng qua tin ZBS (mẫu "SRX | Tri ân khách hàng"). */
export function LuckyWheelZbsFields({
  onChange,
  value,
}: {
  onChange: (patch: Partial<ZbsSettings>) => void;
  value: ZbsSettings;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquareText className="size-4" />
        Gửi voucher qua Zalo (ZBS)
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        Khi khách trúng phần thưởng loại Mã giảm giá, mã 8 số được gửi tới Zalo của số điện thoại trong tài khoản. Tài
        khoản chưa có số điện thoại thì vẫn thấy mã trên website, lượt gửi ghi lỗi để bạn gửi lại sau.
      </p>

      <label className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Gửi tin ZBS kèm mã voucher</span>
          <span className="text-muted-foreground text-xs">Tắt thì mã chỉ hiện trên website.</span>
        </span>
        <Switch checked={value.zbs_enabled} onCheckedChange={(checked) => onChange({ zbs_enabled: checked })} />
      </label>

      <fieldset disabled={!value.zbs_enabled} className="grid gap-4 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="lucky-wheel-zbs-template">ID mẫu ZBS</Label>
            <Input
              id="lucky-wheel-zbs-template"
              inputMode="numeric"
              value={value.zbs_template_id}
              onChange={(event) => onChange({ zbs_template_id: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lucky-wheel-zbs-token">Token OA (bảng token)</Label>
            <Input
              id="lucky-wheel-zbs-token"
              value={value.zbs_token_name}
              onChange={(event) => onChange({ zbs_token_name: event.target.value })}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-5">
          Token OA: CRM lấy cột access_token của dòng có token_name này trong bảng token (OA SRX Việt Nam là zalo_srx).
          Mẫu cần các tham số customer_name, customer_id, voucher_code, voucher, voucher_name, dieukien, start_date,
          expire.
        </p>

        <ZbsTestSender disabled={!value.zbs_enabled} />
      </fieldset>
    </div>
  );
}
