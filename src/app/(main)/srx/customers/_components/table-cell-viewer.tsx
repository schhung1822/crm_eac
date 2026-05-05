"use client";

import React from "react";

import { CalendarClock, MailCheck, MapPin, Phone, ShoppingBag, UserRound, Wallet } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/utils";

import { Users } from "./schema";

const formatDate = (value: unknown) => {
  if (!value) return "—";
  if (value instanceof Date) return value.toLocaleDateString("vi-VN");
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("vi-VN");
};

const formatMoney = (value: number) => value.toLocaleString("vi-VN");

const statusLabelMap: Record<Users["status"], string> = {
  pending_verification: "Chờ xác minh",
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
  banned: "Đã khóa",
};

function getStatusVariant(status: Users["status"]): "default" | "destructive" | "outline" {
  if (status === "banned") {
    return "destructive";
  }

  if (status === "active") {
    return "default";
  }

  return "outline";
}

function getVerificationLabel(isEmailVerified: boolean): string {
  return isEmailVerified ? "Đã xác minh" : "Chưa xác minh";
}

function getOptionalText(value: string): string {
  return value || "—";
}

function buildAddressDetails(item: Users): string[] {
  const details = [item.default_address || "Chưa có địa chỉ mặc định"];

  if (item.address_label) {
    details.push(`Nhãn: ${item.address_label}`);
  }

  if (item.recipient_name) {
    details.push(`Người nhận: ${item.recipient_name}`);
  }

  if (item.recipient_phone) {
    details.push(`SĐT nhận hàng: ${item.recipient_phone}`);
  }

  return details;
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string | number }) {
  return (
    <div className="border-border/70 bg-muted/10 flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-2">
        <span className="text-foreground/80">{icon}</span>
      </div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function TableCellViewer({ item }: { item: Users }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const statusVariant = getStatusVariant(item.status);
  const verificationLabel = getVerificationLabel(item.is_email_verified);
  const addressDetails = buildAddressDetails(item);
  const avatarSrc = item.avatar_url || undefined;
  const displayName = getOptionalText(item.display_name);
  const phoneNumber = getOptionalText(item.phone);
  const genderLabel = getOptionalText(item.gender);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.full_name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 shrink-0 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.65)] ring-2 ring-white/50">
                <AvatarImage src={avatarSrc} alt={item.full_name} className="rounded-full object-cover" />
                <AvatarFallback className="rounded-full bg-gray-300">{getInitials(item.full_name)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0">
              <DrawerTitle className="truncate">{item.full_name}</DrawerTitle>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="truncate">{item.email}</span>
                <Badge variant={statusVariant}>{statusLabelMap[item.status]}</Badge>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-4 text-sm sm:max-h-[82vh]">
          <div className="space-y-3">
            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-3 text-sm font-semibold">Thông tin tài khoản</div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">ID khách hàng</span>
                  <span className="font-medium">{item.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tên hiển thị</span>
                  <span className="truncate font-medium">{displayName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Điện thoại</span>
                  <span className="truncate font-medium">{phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Email xác minh</span>
                  <span className="font-medium">{verificationLabel}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Tổng chi tiêu</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(item.total_spent)}</div>
                <div className="text-muted-foreground text-xs">VNĐ</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Số đơn hàng</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{item.order_count}</div>
                <div className="text-muted-foreground text-xs">Đơn</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Ngày tạo</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatDate(item.created_at)}</div>
                <div className="text-muted-foreground text-xs">Tài khoản</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Đơn gần nhất</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatDate(item.last_order_at)}</div>
                <div className="text-muted-foreground text-xs">Ngày</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<UserRound className="size-4" />} value={genderLabel} />
              <Stat icon={<CalendarClock className="size-4" />} value={formatDate(item.date_of_birth)} />
              <Stat icon={<MailCheck className="size-4" />} value={verificationLabel} />
              <Stat icon={<Phone className="size-4" />} value={phoneNumber} />
              <Stat icon={<ShoppingBag className="size-4" />} value={item.order_count} />
              <Stat icon={<Wallet className="size-4" />} value={`${formatMoney(item.total_spent)} đ`} />
            </div>

            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4" />
                Địa chỉ mặc định
              </div>
              <div className="text-muted-foreground space-y-1 text-sm break-words whitespace-pre-wrap">
                {addressDetails.map((detail) => (
                  <div key={detail}>{detail}</div>
                ))}
              </div>
            </div>

            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-2 text-sm font-semibold">Hoạt động</div>
              <div className="text-muted-foreground space-y-1 text-sm">
                <div>Đăng nhập cuối: {formatDate(item.last_login_at)}</div>
                <div>Cập nhật gần nhất: {formatDate(item.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
