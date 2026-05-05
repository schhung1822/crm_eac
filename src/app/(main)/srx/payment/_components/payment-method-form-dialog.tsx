/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  srxPaymentMethodFeeTypeValues,
  srxPaymentMethodTypeValues,
  type SrxPaymentMethod,
  type SrxPaymentMethodMutationInput,
} from "@/lib/srx-website.shared";

type PaymentMethodFormState = SrxPaymentMethodMutationInput;

const compactGridClass = "grid grid-cols-2 gap-4 max-[520px]:grid-cols-1";

const emptyFormState: PaymentMethodFormState = {
  code: "",
  name: "",
  description: "",
  provider: "",
  method_type: "other",
  instructions: "",
  icon_url: "",
  fee_type: "none",
  fee_value: "0",
  min_order_amount: "",
  max_order_amount: "",
  sort_order: 0,
  is_active: true,
  config_json: "",
};

function buildFormState(paymentMethod: SrxPaymentMethod | null): PaymentMethodFormState {
  if (!paymentMethod) {
    return emptyFormState;
  }

  return {
    code: paymentMethod.code,
    name: paymentMethod.name,
    description: paymentMethod.description,
    provider: paymentMethod.provider,
    method_type: paymentMethod.method_type,
    instructions: paymentMethod.instructions,
    icon_url: paymentMethod.icon_url,
    fee_type: paymentMethod.fee_type,
    fee_value: String(paymentMethod.fee_value),
    min_order_amount: paymentMethod.min_order_amount === null ? "" : String(paymentMethod.min_order_amount),
    max_order_amount: paymentMethod.max_order_amount === null ? "" : String(paymentMethod.max_order_amount),
    sort_order: paymentMethod.sort_order,
    is_active: paymentMethod.is_active,
    config_json: paymentMethod.config_json,
  };
}

function getMethodTypeLabel(value: PaymentMethodFormState["method_type"]): string {
  switch (value) {
    case "cod":
      return "COD";
    case "bank_transfer":
      return "Chuyển khoản";
    case "card":
      return "Thẻ";
    case "e_wallet":
      return "Ví điện tử";
    case "other":
      return "Khác";
    default:
      return value;
  }
}

function getFeeTypeLabel(value: PaymentMethodFormState["fee_type"]): string {
  switch (value) {
    case "none":
      return "Không tính phí";
    case "fixed":
      return "Phí cố định";
    case "percentage":
      return "Phí phần trăm";
    default:
      return value;
  }
}

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxPaymentMethod | null;
  isSubmitting: boolean;
  onSubmit: (value: PaymentMethodFormState) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<PaymentMethodFormState>(() => buildFormState(initialValue));

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
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[600px]">
        <DrawerHeader>
          <DrawerTitle>{initialValue ? "Sửa phương thức thanh toán" : "Thêm phương thức thanh toán"}</DrawerTitle>
          <DrawerDescription>Quản lý phương thức thanh toán hiển thị trên website SRX.</DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-code">Mã</Label>
                  <Input
                    id="payment-code"
                    value={form.code}
                    onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="bank_transfer"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-name">Tên hiển thị</Label>
                  <Input
                    id="payment-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Chuyển khoản ngân hàng"
                    required
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-provider">Provider</Label>
                  <Input
                    id="payment-provider"
                    value={form.provider}
                    onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                    placeholder="VNPAY, Stripe, Internal..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-icon">Icon URL</Label>
                  <Input
                    id="payment-icon"
                    value={form.icon_url}
                    onChange={(event) => setForm((current) => ({ ...current, icon_url: event.target.value }))}
                    placeholder="/icons/vnpay.svg"
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-type">Loại phương thức</Label>
                  <Select
                    value={form.method_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        method_type: value as PaymentMethodFormState["method_type"],
                      }))
                    }
                  >
                    <SelectTrigger id="payment-type">
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxPaymentMethodTypeValues.map((methodType) => (
                        <SelectItem key={methodType} value={methodType}>
                          {getMethodTypeLabel(methodType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-fee-type">Loại phí</Label>
                  <Select
                    value={form.fee_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        fee_type: value as PaymentMethodFormState["fee_type"],
                        fee_value: value === "none" ? "0" : current.fee_value,
                      }))
                    }
                  >
                    <SelectTrigger id="payment-fee-type">
                      <SelectValue placeholder="Chọn loại phí" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxPaymentMethodFeeTypeValues.map((feeType) => (
                        <SelectItem key={feeType} value={feeType}>
                          {getFeeTypeLabel(feeType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-fee-value">Giá trị phí</Label>
                  <Input
                    id="payment-fee-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fee_value}
                    onChange={(event) => setForm((current) => ({ ...current, fee_value: event.target.value }))}
                    disabled={form.fee_type === "none"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-order">Thứ tự</Label>
                  <Input
                    id="payment-order"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sort_order: Number(event.target.value || 0) }))
                    }
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-min-order">Đơn tối thiểu</Label>
                  <Input
                    id="payment-min-order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_order_amount}
                    onChange={(event) => setForm((current) => ({ ...current, min_order_amount: event.target.value }))}
                    placeholder="Tùy chọn"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-max-order">Đơn tối đa</Label>
                  <Input
                    id="payment-max-order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_order_amount}
                    onChange={(event) => setForm((current) => ({ ...current, max_order_amount: event.target.value }))}
                    placeholder="Tùy chọn"
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="payment-description">Mô tả</Label>
                  <Textarea
                    id="payment-description"
                    className="min-h-24"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-instructions">Hướng dẫn thanh toán</Label>
                  <Textarea
                    id="payment-instructions"
                    className="min-h-24"
                    value={form.instructions}
                    onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
                    placeholder="Nội dung hướng dẫn hiển thị cho khách"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment-config">Cấu hình JSON</Label>
                <Textarea
                  id="payment-config"
                  className="min-h-32 font-mono text-xs"
                  value={form.config_json}
                  onChange={(event) => setForm((current) => ({ ...current, config_json: event.target.value }))}
                  placeholder='{"bank_name":"Vietcombank","account_number":"123456789"}'
                />
              </div>

              <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked === true }))}
                />
                <span className="text-sm">Đang hoạt động</span>
              </label>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo phương thức"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
