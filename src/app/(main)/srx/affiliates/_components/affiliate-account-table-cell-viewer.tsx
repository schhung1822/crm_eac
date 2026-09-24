"use client";

import * as React from "react";

import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Globe2,
  Link2,
  MousePointerClick,
  Pencil,
  ReceiptText,
  Share2,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { SrxAffiliateAccount } from "@/lib/srx-affiliates.shared";
import { getInitials } from "@/lib/utils";

import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
  getAffiliateCommissionLabel,
  getAffiliateCommissionTypeLabel,
  getAffiliateGenderLabel,
  getAffiliatePayoutStatusLabel,
  getAffiliatePayoutStatusVariant,
} from "./affiliate-presenters";

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card/60 flex min-w-0 items-center gap-3 rounded-xl border p-3">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="truncate text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-card/50 min-w-0 rounded-xl border p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="grid min-w-0 gap-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 font-medium break-words sm:text-right">{value ?? "—"}</div>
    </div>
  );
}

function ExternalLinkRow({ label, value }: { label: string; value: string }) {
  const canOpen = value.startsWith("https://") || value.startsWith("http://");

  return (
    <div className="grid min-w-0 gap-1 text-sm sm:grid-cols-[90px_minmax(0,1fr)] sm:gap-3">
      <div className="text-muted-foreground">{label}</div>
      {value ? (
        canOpen ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary flex min-w-0 items-center justify-start gap-1.5 sm:justify-end"
            title={value}
          >
            <span className="min-w-0 truncate">{value}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <div className="min-w-0 font-medium break-all sm:text-right">{value}</div>
        )
      ) : (
        <div className="text-muted-foreground sm:text-right">—</div>
      )}
    </div>
  );
}

export function AffiliateAccountTableCellViewer({
  account,
  onEdit,
}: {
  account: SrxAffiliateAccount;
  onEdit: (account: SrxAffiliateAccount) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="text-foreground h-auto max-w-full justify-start px-0 py-0 text-left font-semibold"
        >
          <span className="truncate">{account.user_name}</span>
        </Button>
      </DrawerTrigger>

      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[min(860px,100vw)] data-[vaul-drawer-direction=right]:sm:max-w-[860px]">
        <DrawerHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3 pr-8">
            <Avatar className="size-11 shrink-0 border">
              <AvatarImage src="/avatars/avatar.webp" alt={account.user_name} />
              <AvatarFallback>{getInitials(account.user_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate text-lg">{account.user_name}</DrawerTitle>
                <Badge variant={getAffiliateAccountStatusVariant(account.status)}>
                  {getAffiliateAccountStatusLabel(account.status)}
                </Badge>
                <Badge variant={getAffiliateApplicationStatusVariant(account.application_status)}>
                  {getAffiliateApplicationStatusLabel(account.application_status)}
                </Badge>
              </div>
              <DrawerDescription className="mt-1 truncate">
                {account.user_email} · {account.affiliate_code}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid min-w-0 gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                icon={<MousePointerClick className="size-4" />}
                label="Lượt click"
                value={account.total_clicks.toLocaleString("vi-VN")}
              />
              <MetricCard
                icon={<ShoppingBag className="size-4" />}
                label="Đơn hàng"
                value={account.total_orders.toLocaleString("vi-VN")}
              />
              <MetricCard
                icon={<Link2 className="size-4" />}
                label="Link hoạt động"
                value={`${account.active_link_count}/${account.link_count}`}
              />
              <MetricCard
                icon={<ReceiptText className="size-4" />}
                label="Đơn ghi nhận"
                value={account.referral_count.toLocaleString("vi-VN")}
              />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <DetailSection icon={<UserRound className="size-4" />} title="Tài khoản & hồ sơ">
                <DetailRow label="Họ tên người dùng" value={account.user_name} />
                <DetailRow label="Email đăng nhập" value={account.user_email} />
                <DetailRow label="Điện thoại" value={account.user_phone} />
                <DetailRow label="Họ tên pháp lý" value={account.application_legal_full_name} />
                <DetailRow label="CCCD/CMND" value={account.application_national_id_number} />
                <DetailRow label="Giới tính" value={getAffiliateGenderLabel(account.application_gender)} />
                <DetailRow label="Địa chỉ" value={account.application_permanent_address} />
                <DetailRow label="Email liên hệ" value={account.application_contact_email} />
                <DetailRow label="SĐT liên hệ" value={account.application_contact_phone} />
              </DetailSection>

              <DetailSection icon={<CircleDollarSign className="size-4" />} title="Thiết lập hoa hồng">
                <DetailRow label="Mã affiliate" value={account.affiliate_code} />
                <DetailRow label="Hình thức" value={getAffiliateCommissionTypeLabel(account.commission_type)} />
                <DetailRow label="Mức hoa hồng" value={getAffiliateCommissionLabel(account)} />
                <DetailRow label="Cookie" value={`${account.cookie_duration_days} ngày`} />
                <DetailRow label="Ngày duyệt" value={formatDateTime(account.approved_at)} />
                <DetailRow label="Ngày tạo" value={formatDateTime(account.created_at)} />
                <DetailRow label="Cập nhật" value={formatDateTime(account.updated_at)} />
              </DetailSection>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <DetailSection icon={<Banknote className="size-4" />} title="Hoa hồng">
                <DetailRow label="Chờ duyệt" value={formatCurrency(account.pending_commission_amount)} />
                <DetailRow label="Đã duyệt" value={formatCurrency(account.approved_commission_amount)} />
                <DetailRow label="Đã chi" value={formatCurrency(account.paid_commission_amount)} />
                <DetailRow label="Bị từ chối" value={formatCurrency(account.rejected_commission_amount)} />
                <DetailRow label="Đã hủy" value={formatCurrency(account.cancelled_commission_amount)} />
              </DetailSection>

              <DetailSection icon={<ReceiptText className="size-4" />} title="Đơn ghi nhận">
                <DetailRow label="Chờ duyệt" value={account.pending_referral_count.toLocaleString("vi-VN")} />
                <DetailRow label="Đã duyệt" value={account.approved_referral_count.toLocaleString("vi-VN")} />
                <DetailRow label="Đã thanh toán" value={account.paid_referral_count.toLocaleString("vi-VN")} />
                <DetailRow label="Từ chối" value={account.rejected_referral_count.toLocaleString("vi-VN")} />
                <DetailRow label="Đã hủy" value={account.cancelled_referral_count.toLocaleString("vi-VN")} />
              </DetailSection>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <DetailSection icon={<WalletCards className="size-4" />} title="Thanh toán & ngân hàng">
                <DetailRow label="Số đợt chi" value={account.payout_count.toLocaleString("vi-VN")} />
                <DetailRow label="Chờ chi" value={formatCurrency(account.pending_payout_amount)} />
                <DetailRow label="Đã thanh toán" value={formatCurrency(account.paid_out_amount)} />
                <DetailRow
                  label="Trạng thái gần nhất"
                  value={
                    <Badge variant={getAffiliatePayoutStatusVariant(account.latest_payout_status)}>
                      {getAffiliatePayoutStatusLabel(account.latest_payout_status)}
                    </Badge>
                  }
                />
                <div className="my-1 border-t" />
                <DetailRow label="Chủ tài khoản" value={account.bank_account_holder} />
                <DetailRow label="Ngân hàng" value={account.bank_name} />
                <DetailRow label="Chi nhánh" value={account.bank_branch} />
                <DetailRow label="Số tài khoản" value={account.bank_account_number} />
              </DetailSection>

              <DetailSection icon={<Share2 className="size-4" />} title="Kênh quảng bá">
                <DetailRow label="Kênh chính" value={account.application_social_channel} />
                <ExternalLinkRow label="Website" value={account.application_website_url} />
                <ExternalLinkRow label="Facebook" value={account.application_facebook_url} />
                <ExternalLinkRow label="TikTok" value={account.application_tiktok_url} />
                <div className="my-1 border-t" />
                <div className="min-w-0 text-sm">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <Globe2 className="size-3.5" />
                    Kế hoạch quảng bá
                  </div>
                  <div className="break-words whitespace-pre-wrap">
                    {account.application_promotion_plan || "Chưa có nội dung mô tả"}
                  </div>
                </div>
              </DetailSection>
            </div>

            <DetailSection icon={<FileText className="size-4" />} title="Ghi chú nội bộ">
              <div className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
                {account.application_review_note || "Chưa có ghi chú"}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" /> Hồ sơ tạo: {formatDateTime(account.application_created_at)}
                </span>
                <span>Hồ sơ duyệt: {formatDateTime(account.application_reviewed_at)}</span>
              </div>
            </DetailSection>
          </div>
        </div>

        <DrawerFooter className="bg-background shrink-0 flex-row justify-end border-t px-5 py-4 sm:px-6">
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
          <Button
            onClick={() => {
              setOpen(false);
              onEdit(account);
            }}
          >
            <Pencil className="size-4" />
            Chỉnh sửa affiliate
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
