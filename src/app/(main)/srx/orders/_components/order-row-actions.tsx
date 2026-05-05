"use client";

import Link from "next/link";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { SrxOrder } from "@/lib/srx-orders.shared";

export function OrderRowActions({ order }: { order: SrxOrder }) {
  return (
    <>
      <DropdownMenuLabel>Đơn hàng</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={`/srx/orders/${order.id}`}>Xem chi tiết</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/srx/orders/${order.id}`}>Cập nhật trạng thái</Link>
      </DropdownMenuItem>
    </>
  );
}
