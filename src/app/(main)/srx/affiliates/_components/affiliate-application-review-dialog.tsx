/* eslint-disable complexity, max-lines */
"use client";

import * as React from "react";

import {
  CalendarClock,
  CreditCard,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Share2,
  UserRound,
  UserRoundCheck,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { getInitials } from "@/lib/utils";

import {
  formatDatabaseLocalDateTime,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
} from "./affiliate-presenters";

type AffiliateApplicationReviewFormState = SrxAffiliateApplicationReviewMutationInput;

function buildFormState(application: SrxAffiliateApplication | null): AffiliateApplicationReviewFormState {
  return {
    status: application?.status ?? "pending",
    review_note: application?.review_note ?? "",
  };
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card/50 min-w-0 rounded-xl border p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="grid min-w-0 gap-3">{children}</div>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 text-sm">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="font-medium break-words">{value || "—"}</div>
      </div>
    </div>
  );
}

function ExternalProfileLink({ label, value }: { label: string; value: string }) {
  const isExternalUrl = value.startsWith("https://") || value.startsWith("http://");

  return (
    <div className="min-w-0 text-sm">
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      {value ? (
        isExternalUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary flex max-w-full min-w-0 items-center gap-1.5 hover:underline"
            title={value}
          >
            <span className="min-w-0 truncate">{value}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <div className="max-w-full font-medium break-all">{value}</div>
        )
      ) : (
        <div className="text-muted-foreground">—</div>
      )}
    </div>
  );
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
    if (open) setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  async function submitForm(overrides?: Partial<AffiliateApplicationReviewFormState>) {
    await onSubmit({ ...form, ...overrides });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  const displayName = [initialValue?.user_name, initialValue?.legal_full_name].find(Boolean) ?? "Chưa cập nhật";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6">
          <DialogTitle>Phê duyệt hồ sơ affiliate</DialogTitle>
          <DialogDescription>Kiểm tra thông tin đăng ký trước khi duyệt và kích hoạt tài khoản.</DialogDescription>
        </DialogHeader>

        {initialValue ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="nice-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid min-w-0 gap-4">
                <section className="from-primary/10 via-card to-card min-w-0 rounded-xl border bg-gradient-to-br p-4">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-11 shrink-0 border">
                        <AvatarImage src="/avatars/avatar.webp" alt={displayName} />
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-semibold" title={displayName}>
                          {displayName}
                        </div>
                        <div className="text-muted-foreground truncate text-sm">
                          {initialValue.user_email || initialValue.contact_email || "Chưa có email"}
                        </div>
                        <div className="text-muted-foreground text-sm tabular-nums">
                          {initialValue.user_phone || initialValue.contact_phone || "Chưa có số điện thoại"}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-end">
                      <Badge variant={getAffiliateApplicationStatusVariant(initialValue.status)}>
                        {getAffiliateApplicationStatusLabel(initialValue.status)}
                      </Badge>
                      <div className="text-muted-foreground text-xs">
                        Tạo lúc {formatDatabaseLocalDateTime(initialValue.created_at)}
                      </div>
                      <div
                        className="text-muted-foreground max-w-full truncate text-xs"
                        title={initialValue.affiliate_code}
                      >
                        {initialValue.affiliate_code
                          ? `${initialValue.affiliate_code}${
                              initialValue.affiliate_account_status
                                ? ` · ${getAffiliateAccountStatusLabel(initialValue.affiliate_account_status)}`
                                : ""
                            }`
                          : "Chưa liên kết tài khoản affiliate"}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-card/50 grid gap-4 rounded-xl border p-4 md:grid-cols-2">
                  <div className="grid min-w-0 gap-2">
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
                      <SelectTrigger id="affiliate-application-review-status" className="w-full">
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

                  <div className="bg-muted/40 min-w-0 rounded-lg px-3 py-2.5 text-sm">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <UserRoundCheck className="text-muted-foreground size-4" />
                      Người duyệt trước đó
                    </div>
                    <div className="truncate">{initialValue.reviewed_by_user_name || "Chưa có"}</div>
                    <div className="text-muted-foreground text-xs">{formatDateTime(initialValue.reviewed_at)}</div>
                  </div>
                </section>

                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  <DetailSection title="Thông tin hồ sơ" icon={<UserRound className="size-4" />}>
                    <InfoRow
                      icon={<UserRound className="size-4" />}
                      label="Họ tên pháp lý"
                      value={initialValue.legal_full_name}
                    />
                    <InfoRow
                      icon={<CreditCard className="size-4" />}
                      label="CCCD/CMND"
                      value={initialValue.national_id_number}
                    />
                    <InfoRow
                      icon={<MapPin className="size-4" />}
                      label="Địa chỉ thường trú"
                      value={initialValue.permanent_address}
                    />
                    <InfoRow
                      icon={<Mail className="size-4" />}
                      label="Email liên hệ"
                      value={initialValue.contact_email}
                    />
                    <InfoRow
                      icon={<Phone className="size-4" />}
                      label="Điện thoại"
                      value={initialValue.contact_phone}
                    />
                  </DetailSection>

                  <DetailSection title="Kênh quảng bá" icon={<Share2 className="size-4" />}>
                    <InfoRow
                      icon={<Megaphone className="size-4" />}
                      label="Kênh chính"
                      value={initialValue.social_channel}
                    />
                    <div className="min-w-0 border-t pt-3">
                      <ExternalProfileLink label="Website" value={initialValue.website_url} />
                    </div>
                    <div className="min-w-0 border-t pt-3">
                      <ExternalProfileLink label="Facebook" value={initialValue.facebook_url} />
                    </div>
                    <div className="min-w-0 border-t pt-3">
                      <ExternalProfileLink label="TikTok" value={initialValue.tiktok_url} />
                    </div>
                  </DetailSection>
                </div>

                <DetailSection title="Kế hoạch quảng bá" icon={<Globe2 className="size-4" />}>
                  <div className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
                    {initialValue.promotion_plan || "Chưa có nội dung mô tả"}
                  </div>
                </DetailSection>

                <div className="grid gap-2">
                  <Label htmlFor="affiliate-application-review-note">Ghi chú duyệt</Label>
                  <Textarea
                    id="affiliate-application-review-note"
                    className="min-h-24 resize-y"
                    value={form.review_note}
                    onChange={(event) => setForm((current) => ({ ...current, review_note: event.target.value }))}
                    placeholder="Ghi chú nội bộ cho hồ sơ affiliate"
                  />
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarClock className="size-3.5" />
                    Lần duyệt gần nhất: {formatDateTime(initialValue.reviewed_at)}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-background shrink-0 border-t px-5 py-4 sm:px-6">
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
                  {isSubmitting ? "Đang lưu..." : "Từ chối"}
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
        ) : (
          <div className="text-muted-foreground p-6 text-sm">Chưa chọn hồ sơ để xem.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
