"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { parseSrxOrder, srxOrderStatusValues, type SrxOrder } from "@/lib/srx-orders.shared";

import { getOrderStatusLabel, getOrderStatusVariant } from "./order-presenters";

export function OrderStatusQuickSelect({
  order,
  onUpdated,
}: {
  order: SrxOrder;
  onUpdated: (order: SrxOrder) => void;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);

  async function handleChange(value: string) {
    const nextStatus = value as SrxOrder["order_status"];

    if (nextStatus === order.order_status || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/srx/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_status: nextStatus,
          payment_status: order.payment_status,
          notes: order.notes,
          status_note: "Cập nhật nhanh từ danh sách đơn hàng",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể cập nhật trạng thái đơn hàng");
      }

      const nextOrder = parseSrxOrder(result.order);
      onUpdated(nextOrder);
      router.refresh();
      toast.success(`Đã chuyển ${order.order_number} sang ${getOrderStatusLabel(nextOrder.order_status)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái đơn hàng");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Select value={order.order_status} onValueChange={handleChange} disabled={isUpdating}>
      <SelectTrigger className="h-9 w-[170px] px-2.5" aria-label={`Cập nhật trạng thái đơn ${order.order_number}`}>
        <span className="flex min-w-0 items-center gap-2">
          {isUpdating ? <LoaderCircle className="size-3.5 shrink-0 animate-spin" /> : null}
          <Badge variant={getOrderStatusVariant(order.order_status)} className="truncate">
            {isUpdating ? "Đang cập nhật..." : getOrderStatusLabel(order.order_status)}
          </Badge>
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {srxOrderStatusValues.map((status) => (
          <SelectItem key={status} value={status}>
            {getOrderStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
