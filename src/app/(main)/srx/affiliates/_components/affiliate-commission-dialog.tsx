"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  srxAffiliateCommissionTypeValues,
  type SrxAffiliateAccount,
  type SrxAffiliateCommissionMutationInput,
} from "@/lib/srx-affiliates.shared";

import { formatCurrency, getAffiliateCommissionLabel, getAffiliateCommissionTypeLabel } from "./affiliate-presenters";

type AffiliateCommissionFormState = SrxAffiliateCommissionMutationInput;

function buildFormState(account: SrxAffiliateAccount | null): AffiliateCommissionFormState {
  return {
    commission_type: account?.commission_type ?? "percent",
    commission_rate: account ? String(account.commission_rate) : "5",
    cookie_duration_days: account?.cookie_duration_days ?? 30,
  };
}

export function AffiliateCommissionDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxAffiliateAccount | null;
  isSubmitting: boolean;
  onSubmit: (value: AffiliateCommissionFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<AffiliateCommissionFormState>(() => buildFormState(initialValue));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thiết lập hoa hồng</DialogTitle>
          <DialogDescription>
            Cập nhật kiểu hoa hồng, mức hưởng và thời gian lưu cookie cho affiliate.
          </DialogDescription>
        </DialogHeader>

        {initialValue ? (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <div className="font-medium">{initialValue.user_name}</div>
                <div className="text-muted-foreground">{initialValue.user_email}</div>
                <div className="text-muted-foreground">Mã affiliate: {initialValue.affiliate_code}</div>
              </div>

              <div className="grid gap-1 text-sm md:text-right">
                <div>Thiết lập hiện tại: {getAffiliateCommissionLabel(initialValue)}</div>
                <div className="text-muted-foreground">Cookie: {initialValue.cookie_duration_days} ngày</div>
                <div className="text-muted-foreground">
                  Chưa chi:{" "}
                  {formatCurrency(initialValue.pending_commission_amount + initialValue.approved_commission_amount)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="affiliate-commission-type">Loại hoa hồng</Label>
                <Select
                  value={form.commission_type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      commission_type: value as AffiliateCommissionFormState["commission_type"],
                    }))
                  }
                >
                  <SelectTrigger id="affiliate-commission-type">
                    <SelectValue placeholder="Chọn loại hoa hồng" />
                  </SelectTrigger>
                  <SelectContent>
                    {srxAffiliateCommissionTypeValues.map((commissionType) => (
                      <SelectItem key={commissionType} value={commissionType}>
                        {getAffiliateCommissionTypeLabel(commissionType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="affiliate-commission-rate">
                  {form.commission_type === "percent" ? "Tỷ lệ %" : "Số tiền cố định"}
                </Label>
                <Input
                  id="affiliate-commission-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      commission_rate: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="affiliate-cookie-days">Cookie lưu trong</Label>
                <Input
                  id="affiliate-cookie-days"
                  type="number"
                  min="1"
                  max="3650"
                  value={form.cookie_duration_days}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cookie_duration_days: Number(event.target.value || 0),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border p-4 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <div className="font-medium">Hiệu suất</div>
                <div>Click: {initialValue.total_clicks}</div>
                <div>Đơn đã ghi nhận: {initialValue.total_orders}</div>
                <div>
                  Link đang hoạt động: {initialValue.active_link_count}/{initialValue.link_count}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Hoa hồng</div>
                <div>Chờ duyệt: {formatCurrency(initialValue.pending_commission_amount)}</div>
                <div>Đã duyệt: {formatCurrency(initialValue.approved_commission_amount)}</div>
                <div>Đã chi: {formatCurrency(initialValue.paid_commission_amount)}</div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu thiết lập"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
