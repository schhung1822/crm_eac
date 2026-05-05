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
  srxAffiliateApplicationStatusValues,
  type SrxAffiliateApplication,
  type SrxAffiliateApplicationReviewMutationInput,
} from "@/lib/srx-affiliates.shared";

import {
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateApplicationStatusLabel,
} from "./affiliate-presenters";

type AffiliateApplicationReviewFormState = SrxAffiliateApplicationReviewMutationInput;

function buildFormState(application: SrxAffiliateApplication | null): AffiliateApplicationReviewFormState {
  return {
    status: application?.status ?? "pending",
    review_note: application?.review_note ?? "",
  };
}

export function AffiliateApplicationReviewDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxAffiliateApplication | null;
  isSubmitting: boolean;
  onSubmit: (value: AffiliateApplicationReviewFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<AffiliateApplicationReviewFormState>(() => buildFormState(initialValue));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  async function submitForm(overrides?: Partial<AffiliateApplicationReviewFormState>) {
    await onSubmit({
      ...form,
      ...overrides,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phê duyệt hồ sơ affiliate</DialogTitle>
          <DialogDescription>
            Hồ sơ được lấy trực tiếp từ bảng affiliate_applications. Khi duyệt, tài khoản affiliate và user sẽ tự kích
            hoạt.
          </DialogDescription>
        </DialogHeader>

        {initialValue ? (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <div className="font-medium">
                  {initialValue.user_name || initialValue.legal_full_name || "Chưa cập nhật"}
                </div>
                <div className="text-muted-foreground">
                  {initialValue.user_email || initialValue.contact_email || "—"}
                </div>
                <div className="text-muted-foreground">
                  {initialValue.user_phone || initialValue.contact_phone || "—"}
                </div>
              </div>

              <div className="grid gap-1 text-sm md:text-right">
                <div>Tạo hồ sơ: {formatDateTime(initialValue.created_at)}</div>
                <div className="text-muted-foreground">Duyệt lần cuối: {formatDateTime(initialValue.reviewed_at)}</div>
                <div className="text-muted-foreground">
                  Affiliate: {initialValue.affiliate_code || "Chưa liên kết"}
                  {initialValue.affiliate_account_status
                    ? ` · ${getAffiliateAccountStatusLabel(initialValue.affiliate_account_status)}`
                    : ""}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="affiliate-application-review-status">Trạng thái hồ sơ</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as AffiliateApplicationReviewFormState["status"],
                    }))
                  }
                >
                  <SelectTrigger id="affiliate-application-review-status">
                    <SelectValue placeholder="Chọn trạng thái hồ sơ" />
                  </SelectTrigger>
                  <SelectContent>
                    {srxAffiliateApplicationStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getAffiliateApplicationStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="font-medium">Người duyệt trước đó</div>
                <div>{initialValue.reviewed_by_user_name || "—"}</div>
                <div className="text-muted-foreground">{formatDateTime(initialValue.reviewed_at)}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="affiliate-application-review-note">Ghi chú duyệt</Label>
              <Textarea
                id="affiliate-application-review-note"
                className="min-h-28"
                value={form.review_note}
                onChange={(event) => setForm((current) => ({ ...current, review_note: event.target.value }))}
                placeholder="Ghi chú nội bộ cho hồ sơ affiliate"
              />
            </div>

            <div className="grid gap-4 rounded-lg border p-4 text-sm md:grid-cols-2">
              <div className="space-y-2">
                <div className="font-medium">Thông tin hồ sơ</div>
                <div>Họ tên pháp lý: {initialValue.legal_full_name || "—"}</div>
                <div>CCCD/CMND: {initialValue.national_id_number || "—"}</div>
                <div>Địa chỉ thường trú: {initialValue.permanent_address || "—"}</div>
                <div>Email liên hệ: {initialValue.contact_email || "—"}</div>
                <div>Điện thoại: {initialValue.contact_phone || "—"}</div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">Kênh quảng bá</div>
                <div>Kênh chính: {initialValue.social_channel || "—"}</div>
                <div>Website: {initialValue.website_url || "—"}</div>
                <div>Facebook: {initialValue.facebook_url || "—"}</div>
                <div>TikTok: {initialValue.tiktok_url || "—"}</div>
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border p-4 text-sm">
              <div className="font-medium">Kế hoạch quảng bá</div>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {initialValue.promotion_plan || "Chưa có nội dung mô tả"}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              {initialValue.status !== "rejected" ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => submitForm({ status: "rejected" })}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Từ chối hồ sơ"}
                </Button>
              ) : null}
              {initialValue.status !== "approved" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => submitForm({ status: "approved" })}
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
