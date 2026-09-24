"use client";
import React from "react";

import Link from "next/link";

import { BadgeCheck, Cake, Landmark, Tags, User2, UserPlus } from "lucide-react";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/utils";

import { userSchema } from "./schema";

const fmt = (n: unknown) => {
  if (typeof n === "number") return n.toLocaleString("vi-VN");
  const num = Number(String(n ?? "0").replaceAll(",", ""));
  return Number.isFinite(num) ? num.toLocaleString("vi-VN") : String(n);
};

const formatDate = (d: unknown) => {
  if (!d) return "—";
  if (d instanceof Date) return d.toLocaleDateString("vi-VN");
  const date = new Date(String(d));
  return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString("vi-VN");
};

const valueOrDash = (value: string) => value || "—";

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

type TableCellViewerProps = {
  item: z.infer<typeof userSchema>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function TableCellViewer({
  item,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: TableCellViewerProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const createdAt = item.create_time instanceof Date ? item.create_time.toLocaleDateString("vi-VN") : item.create_time;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={isMobile ? "bottom" : "right"}>
      {!hideTrigger && (
        <DrawerTrigger asChild>
          <Button
            variant="link"
            className="text-foreground h-auto max-w-full justify-start px-0 py-0 text-left font-semibold"
          >
            <span className="truncate">{item.name}</span>
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 shrink-0 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.65)] ring-2 ring-white/50">
                <AvatarImage src="/avatars/avatar.webp" alt={item.name} className="rounded-full object-cover" />
                <AvatarFallback className="rounded-full bg-gray-300">{getInitials(item.name)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0">
              <DrawerTitle className="truncate">{item.name}</DrawerTitle>
              <DrawerDescription className="truncate">{item.customer_ID}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll nice-scroll flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-4 text-sm sm:max-h-[82vh]">
          {!isMobile && (
            <div className="grid gap-2">
              <div className="flex gap-2 leading-none font-medium">
                <DrawerDescription>Ngày tạo: {createdAt}</DrawerDescription>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-3 text-sm font-semibold">Thông tin</div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Số điện thoại</span>
                  <span className="truncate font-medium">{valueOrDash(item.phone)}</span>
                </div>
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground">Địa chỉ</span>
                  <span className="font-medium">{valueOrDash(item.address)}</span>
                </div>
                <div className="flex flex-col items-start justify-between gap-3">
                  <span className="text-muted-foreground">Công ty</span>
                  <span className="font-medium">{valueOrDash(item.company)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Nợ hiện tại</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(item.no_hien_tai)}</div>
                <div className="text-muted-foreground text-xs">VNĐ</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Tổng bán</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(item.tong_ban)}</div>
                <div className="text-muted-foreground text-xs">VNĐ</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Tổng bán (trừ trả)</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(item.tong_ban_tru_tra_hang)}</div>
                <div className="text-muted-foreground text-xs">VNĐ</div>
              </div>
              <div className="bg-card/60 rounded-2xl border px-4 py-3">
                <div className="text-muted-foreground text-xs">Giao dịch gần nhất</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatDate(item.last_payment)}</div>
                <div className="text-muted-foreground text-xs">Ngày</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Cake className="size-4" />} value={formatDate(item.birth)} />
              <Stat icon={<User2 className="size-4" />} value={valueOrDash(item.gender)} />
              <Stat icon={<BadgeCheck className="size-4" />} value={valueOrDash(item.class)} />
              <Stat icon={<Tags className="size-4" />} value={valueOrDash(item.class)} />
              <Stat icon={<Landmark className="size-4" />} value={valueOrDash(item.branch)} />
              <Stat icon={<UserPlus className="size-4" />} value={valueOrDash(item.create_by)} />
            </div>

            <div className="bg-card/60 rounded-2xl border p-4">
              <div className="mb-2 text-sm font-semibold">Ghi chú</div>
              <div className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
                {valueOrDash(item.note)}
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Link href={`/orders/${item.customer_ID}`}>
            <Button className="w-full">Xem chi tiết</Button>
          </Link>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
