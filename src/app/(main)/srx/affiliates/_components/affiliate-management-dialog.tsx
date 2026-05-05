/* eslint-disable complexity */
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  srxAffiliateAccountStatusValues,
  srxAffiliateApplicationStatusValues,
  type SrxAffiliateAccount,
  type SrxAffiliateManagementMutationInput,
} from "@/lib/srx-affiliates.shared";

import {
  formatCurrency,
  getAffiliateAccountStatusLabel,
  getAffiliateApplicationStatusLabel,
} from "./affiliate-presenters";

type AffiliateManagementFormState = SrxAffiliateManagementMutationInput;

function buildFormState(account: SrxAffiliateAccount | null): AffiliateManagementFormState {
  return {
    status: account?.status ?? "inactive",
    application_status: account?.application_status ?? undefined,
    review_note: account?.application_review_note ?? "",
  };
}

export function AffiliateManagementDialog({
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
  onSubmit: (value: AffiliateManagementFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<AffiliateManagementFormState>(() => buildFormState(initialValue));
  const canApproveAffiliate = Boolean(initialValue?.application_id) && initialValue?.application_status !== "approved";

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  async function submitForm(overrides?: Partial<AffiliateManagementFormState>) {
    await onSubmit({
      ...form,
      ...overrides,
      application_status: initialValue?.application_id
        ? (overrides?.application_status ?? form.application_status)
        : undefined,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý affiliate</DialogTitle>
          <DialogDescription>
            Cập nhật trạng thái tài khoản affiliate và kết quả duyệt hồ sơ liên kết.
          </DialogDescription>
        </DialogHeader>

        {initialValue ? (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <div className="font-medium">{initialValue.user_name}</div>
                <div className="text-muted-foreground">{initialValue.user_email}</div>
                <div className="text-muted-foreground">{initialValue.user_phone || "Chưa có số điện thoại"}</div>
              </div>

              <div className="grid gap-1 text-sm md:text-right">
                <div>Mã affiliate: {initialValue.affiliate_code}</div>
                <div className="text-muted-foreground">
                  Click: {initialValue.total_clicks} · Đơn: {initialValue.total_orders}
                </div>
                <div className="text-muted-foreground">
                  Hoa hồng chờ duyệt: {formatCurrency(initialValue.pending_commission_amount)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="affiliate-account-status">Trạng thái tài khoản</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as AffiliateManagementFormState["status"],
                    }))
                  }
                >
                  <SelectTrigger id="affiliate-account-status">
                    <SelectValue placeholder="Chọn trạng thái tài khoản" />
                  </SelectTrigger>
                  <SelectContent>
                    {srxAffiliateAccountStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getAffiliateAccountStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="affiliate-application-status">Trạng thái hồ sơ</Label>
                <Select
                  value={initialValue.application_id ? form.application_status : undefined}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      application_status: value as AffiliateManagementFormState["application_status"],
                      status: value === "approved" ? "active" : current.status,
                    }))
                  }
                  disabled={!initialValue.application_id}
                >
                  <SelectTrigger id="affiliate-application-status">
                    <SelectValue
                      placeholder={
                        initialValue.application_id
                          ? "Chọn trạng thái hồ sơ"
                          : getAffiliateApplicationStatusLabel(initialValue.application_status)
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {srxAffiliateApplicationStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getAffiliateApplicationStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Khi hồ sơ được duyệt, tài khoản affiliate của người dùng sẽ tự kích hoạt.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="affiliate-review-note">Ghi chú duyệt</Label>
              <Textarea
                id="affiliate-review-note"
                className="min-h-28"
                value={form.review_note}
                onChange={(event) => setForm((current) => ({ ...current, review_note: event.target.value }))}
                placeholder="Ghi chú nội bộ cho hồ sơ affiliate"
              />
            </div>

            <div className="grid gap-4 rounded-lg border p-4 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <div className="font-medium">Thông tin hồ sơ</div>
                <div>Email liên hệ: {initialValue.application_contact_email || "—"}</div>
                <div>Điện thoại: {initialValue.application_contact_phone || "—"}</div>
                <div>Kênh xã hội: {initialValue.application_social_channel || "—"}</div>
                <div>Website: {initialValue.application_website_url || "—"}</div>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Ngân hàng nhận hoa hồng</div>
                <div>Chủ tài khoản: {initialValue.bank_account_holder || "—"}</div>
                <div>Ngân hàng: {initialValue.bank_name || "—"}</div>
                <div>Chi nhánh: {initialValue.bank_branch || "—"}</div>
                <div>Số tài khoản: {initialValue.bank_account_number || "—"}</div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              {canApproveAffiliate ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => submitForm({ status: "active", application_status: "approved" })}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang duyệt..." : "Duyệt & kích hoạt"}
                </Button>
              ) : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
