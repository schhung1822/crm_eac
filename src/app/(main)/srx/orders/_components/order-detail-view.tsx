/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  parseSrxOrder,
  srxOrderPaymentStatusValues,
  srxOrderStatusValues,
  type SrxOrder,
} from "@/lib/srx-orders.shared";

import {
  formatCurrency,
  formatDateTime,
  getOrderStatusLabel,
  getOrderStatusVariant,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "./order-presenters";

export function OrderDetailView({ initialValue }: { initialValue: SrxOrder }) {
  const router = useRouter();
  const [order, setOrder] = React.useState<SrxOrder>(initialValue);
  const [orderStatus, setOrderStatus] = React.useState<SrxOrder["order_status"]>(initialValue.order_status);
  const [paymentStatus, setPaymentStatus] = React.useState<SrxOrder["payment_status"]>(initialValue.payment_status);
  const [notes, setNotes] = React.useState(initialValue.notes);
  const [statusNote, setStatusNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const submitLabel = isSubmitting ? "Đang lưu..." : "Lưu cập nhật";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/srx/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_status: orderStatus,
          payment_status: paymentStatus,
          notes,
          status_note: statusNote,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể cập nhật đơn hàng");
      }

      const nextOrder = parseSrxOrder(result.order);
      setOrder(nextOrder);
      setOrderStatus(nextOrder.order_status);
      setPaymentStatus(nextOrder.payment_status);
      setNotes(nextOrder.notes);
      setStatusNote("");
      toast.success("Đã cập nhật đơn hàng");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/srx/orders">Đơn hàng</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{order.order_number}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getOrderStatusVariant(order.order_status)}>
                {getOrderStatusLabel(order.order_status)}
              </Badge>
              <Badge variant={order.payment_status === "paid" ? "default" : "outline"}>
                {getPaymentStatusLabel(order.payment_status)}
              </Badge>
              <Badge variant="outline">{getPaymentMethodLabel(order.payment_method)}</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{order.order_number}</h1>
              <p className="text-muted-foreground max-w-3xl text-sm">
                Đặt lúc {formatDateTime(order.placed_at)} · Tổng tiền {formatCurrency(order.grand_total)}
              </p>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href="/srx/orders">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm trong đơn</CardTitle>
              <CardDescription>
                {order.item_count} dòng sản phẩm · {order.total_quantity} sản phẩm
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {order.items.length === 0 ? (
                <div className="text-muted-foreground text-sm">Đơn hàng chưa có sản phẩm nào.</div>
              ) : (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 xl:flex-row xl:items-start xl:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-muted-foreground text-sm">
                        {item.variant_name || "Không có biến thể"}
                        {item.sku ? ` · SKU: ${item.sku}` : ""}
                      </div>
                    </div>
                    <div className="grid min-w-[240px] gap-1 text-sm xl:text-right">
                      <div>Đơn giá: {formatCurrency(item.unit_price)}</div>
                      <div>Số lượng: {item.quantity}</div>
                      <div>Giảm giá: {formatCurrency(item.discount_amount)}</div>
                      <div className="font-medium">Thành tiền: {formatCurrency(item.line_total)}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ</CardTitle>
                <CardDescription>Thông tin giao hàng và thanh toán của đơn hàng.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {order.addresses.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Đơn hàng chưa có địa chỉ.</div>
                ) : (
                  order.addresses.map((address) => (
                    <div key={address.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">
                          {address.address_type === "shipping" ? "Giao hàng" : "Thanh toán"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{address.recipient_name}</div>
                        <div>{address.recipient_phone}</div>
                        <div className="text-muted-foreground">{address.full_address}</div>
                        {address.postal_code ? (
                          <div className="text-muted-foreground">Mã bưu chính: {address.postal_code}</div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tổng hợp thanh toán</CardTitle>
                <CardDescription>Các khoản giá trị cấu thành tổng đơn.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Giảm giá</span>
                  <span>{formatCurrency(order.discount_total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phí vận chuyển</span>
                  <span>{formatCurrency(order.shipping_total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thuế</span>
                  <span>{formatCurrency(order.tax_total)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(order.grand_total)}</span>
                </div>
                <div className="text-muted-foreground border-t pt-3 text-xs">
                  Thanh toán lúc: {formatDateTime(order.paid_at)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lịch sử trạng thái</CardTitle>
              <CardDescription>Theo dõi quá trình cập nhật trạng thái của đơn hàng.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {order.history.length === 0 ? (
                <div className="text-muted-foreground text-sm">Chưa có lịch sử trạng thái.</div>
              ) : (
                order.history.map((history) => (
                  <div key={history.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getOrderStatusVariant(history.status)}>
                          {getOrderStatusLabel(history.status)}
                        </Badge>
                        <span className="text-muted-foreground text-sm">{formatDateTime(history.changed_at)}</span>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {history.changed_by_name || history.changed_by_email || "Hệ thống"}
                      </div>
                    </div>
                    {history.note ? <div className="mt-3 text-sm leading-6">{history.note}</div> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Cập nhật đơn hàng</CardTitle>
              <CardDescription>Thay đổi trạng thái xử lý, thanh toán và ghi chú nội bộ của đơn hàng.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="order-status">Trạng thái đơn</Label>
                  <Select
                    value={orderStatus}
                    onValueChange={(value) => setOrderStatus(value as SrxOrder["order_status"])}
                  >
                    <SelectTrigger id="order-status">
                      <SelectValue placeholder="Chọn trạng thái đơn" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxOrderStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getOrderStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-status">Trạng thái thanh toán</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(value) => setPaymentStatus(value as SrxOrder["payment_status"])}
                  >
                    <SelectTrigger id="payment-status">
                      <SelectValue placeholder="Chọn trạng thái thanh toán" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxOrderPaymentStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getPaymentStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status-note">Ghi chú trạng thái</Label>
                  <Textarea
                    id="status-note"
                    className="min-h-28"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder="Ghi chú ngắn cho lần đổi trạng thái này"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="order-notes">Ghi chú nội bộ</Label>
                  <Textarea
                    id="order-notes"
                    className="min-h-40"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Ghi chú nội bộ của đơn hàng"
                  />
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Khách hàng</span>
                    <span className="text-right">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Điện thoại</span>
                    <span>{order.customer_phone}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Tài khoản</span>
                    <span className="text-right">{order.user_email || "Khách vãng lai"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Cập nhật cuối</span>
                    <span>{formatDateTime(order.updated_at)}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="justify-end gap-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/srx/orders")}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="size-4" />
                  {submitLabel}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
