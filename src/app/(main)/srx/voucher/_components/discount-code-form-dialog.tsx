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
  srxDiscountCodeScopeValues,
  srxDiscountCodeTypeValues,
  type SrxDiscountCode,
  type SrxDiscountCodeMutationInput,
} from "@/lib/srx-website.shared";

type DiscountCodeFormState = SrxDiscountCodeMutationInput;

type ReferenceOption = {
  id: string;
  label: string;
};

const compactGridClass = "grid grid-cols-2 gap-4 max-[520px]:grid-cols-1";

const emptyFormState: DiscountCodeFormState = {
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "0",
  max_discount_amount: "",
  min_order_amount: "",
  total_usage_limit: "",
  per_user_limit: "",
  scope_type: "all_orders",
  starts_at: "",
  ends_at: "",
  is_active: true,
  product_ids: [],
  category_ids: [],
};

function toLocalDateTimeInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildFormState(discountCode: SrxDiscountCode | null): DiscountCodeFormState {
  if (!discountCode) {
    return emptyFormState;
  }

  return {
    code: discountCode.code,
    name: discountCode.name,
    description: discountCode.description,
    discount_type: discountCode.discount_type,
    discount_value: String(discountCode.discount_value),
    max_discount_amount: discountCode.max_discount_amount === null ? "" : String(discountCode.max_discount_amount),
    min_order_amount: discountCode.min_order_amount === null ? "" : String(discountCode.min_order_amount),
    total_usage_limit: discountCode.total_usage_limit === null ? "" : String(discountCode.total_usage_limit),
    per_user_limit: discountCode.per_user_limit === null ? "" : String(discountCode.per_user_limit),
    scope_type: discountCode.scope_type,
    starts_at: toLocalDateTimeInput(discountCode.starts_at),
    ends_at: toLocalDateTimeInput(discountCode.ends_at),
    is_active: discountCode.is_active,
    product_ids: discountCode.product_ids,
    category_ids: discountCode.category_ids,
  };
}

function getDiscountTypeLabel(value: DiscountCodeFormState["discount_type"]): string {
  switch (value) {
    case "percentage":
      return "Phần trăm";
    case "fixed_amount":
      return "Số tiền cố định";
    case "free_shipping":
      return "Miễn phí vận chuyển";
    default:
      return value;
  }
}

function getScopeLabel(value: DiscountCodeFormState["scope_type"]): string {
  switch (value) {
    case "all_orders":
      return "Toàn bộ đơn hàng";
    case "specific_products":
      return "Sản phẩm cụ thể";
    case "specific_categories":
      return "Danh mục cụ thể";
    default:
      return value;
  }
}

export function DiscountCodeFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
  productOptions,
  categoryOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxDiscountCode | null;
  isSubmitting: boolean;
  onSubmit: (value: DiscountCodeFormState) => Promise<void>;
  productOptions: ReferenceOption[];
  categoryOptions: ReferenceOption[];
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<DiscountCodeFormState>(() => buildFormState(initialValue));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  function toggleProduct(productId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      product_ids: checked
        ? [...current.product_ids, productId]
        : current.product_ids.filter((item) => item !== productId),
    }));
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      category_ids: checked
        ? [...current.category_ids, categoryId]
        : current.category_ids.filter((item) => item !== categoryId),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[600px]">
        <DrawerHeader>
          <DrawerTitle>{initialValue ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}</DrawerTitle>
          <DrawerDescription>Quản lý chương trình giảm giá áp dụng cho website SRX.</DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-code">Mã giảm giá</Label>
                  <Input
                    id="discount-code"
                    value={form.code}
                    onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    placeholder="SRX10"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-name">Tên chương trình</Label>
                  <Input
                    id="discount-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Giảm 10% toàn bộ đơn hàng"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount-description">Mô tả</Label>
                <Textarea
                  id="discount-description"
                  className="min-h-24"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Mô tả ngắn về mã giảm giá"
                />
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-type">Loại giảm</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        discount_type: value as DiscountCodeFormState["discount_type"],
                        discount_value: value === "free_shipping" ? "0" : current.discount_value,
                      }))
                    }
                  >
                    <SelectTrigger id="discount-type">
                      <SelectValue placeholder="Chọn loại giảm" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxDiscountCodeTypeValues.map((discountType) => (
                        <SelectItem key={discountType} value={discountType}>
                          {getDiscountTypeLabel(discountType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-value">Giá trị giảm</Label>
                  <Input
                    id="discount-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    onChange={(event) => setForm((current) => ({ ...current, discount_value: event.target.value }))}
                    disabled={form.discount_type === "free_shipping"}
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-max">Mức giảm tối đa</Label>
                  <Input
                    id="discount-max"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_discount_amount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, max_discount_amount: event.target.value }))
                    }
                    placeholder="Tùy chọn"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-min-order">Đơn tối thiểu</Label>
                  <Input
                    id="discount-min-order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_order_amount}
                    onChange={(event) => setForm((current) => ({ ...current, min_order_amount: event.target.value }))}
                    placeholder="Tùy chọn"
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-total-limit">Giới hạn tổng lượt dùng</Label>
                  <Input
                    id="discount-total-limit"
                    type="number"
                    min="0"
                    value={form.total_usage_limit}
                    onChange={(event) => setForm((current) => ({ ...current, total_usage_limit: event.target.value }))}
                    placeholder="Không giới hạn"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-user-limit">Giới hạn mỗi khách</Label>
                  <Input
                    id="discount-user-limit"
                    type="number"
                    min="0"
                    value={form.per_user_limit}
                    onChange={(event) => setForm((current) => ({ ...current, per_user_limit: event.target.value }))}
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-scope">Phạm vi áp dụng</Label>
                  <Select
                    value={form.scope_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        scope_type: value as DiscountCodeFormState["scope_type"],
                        product_ids: value === "specific_products" ? current.product_ids : [],
                        category_ids: value === "specific_categories" ? current.category_ids : [],
                      }))
                    }
                  >
                    <SelectTrigger id="discount-scope">
                      <SelectValue placeholder="Chọn phạm vi" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxDiscountCodeScopeValues.map((scopeType) => (
                        <SelectItem key={scopeType} value={scopeType}>
                          {getScopeLabel(scopeType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked === true }))}
                  />
                  <span className="text-sm">Đang hoạt động</span>
                </label>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="discount-starts">Bắt đầu</Label>
                  <Input
                    id="discount-starts"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-ends">Kết thúc</Label>
                  <Input
                    id="discount-ends"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </div>
              </div>

              {form.scope_type === "specific_products" ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Sản phẩm áp dụng</Label>
                    <span className="text-muted-foreground text-xs">{form.product_ids.length} sản phẩm được chọn</span>
                  </div>

                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-4 max-[520px]:grid-cols-1">
                    {productOptions.length === 0 ? (
                      <div className="text-muted-foreground text-sm">Chưa có sản phẩm nào để áp mã.</div>
                    ) : (
                      productOptions.map((product) => (
                        <label key={product.id} className="flex items-center gap-3 rounded-md px-1 py-1">
                          <Checkbox
                            checked={form.product_ids.includes(product.id)}
                            onCheckedChange={(checked) => toggleProduct(product.id, checked === true)}
                          />
                          <span className="text-sm">{product.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {form.scope_type === "specific_categories" ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Danh mục áp dụng</Label>
                    <span className="text-muted-foreground text-xs">{form.category_ids.length} danh mục được chọn</span>
                  </div>

                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-4 max-[520px]:grid-cols-1">
                    {categoryOptions.length === 0 ? (
                      <div className="text-muted-foreground text-sm">Chưa có danh mục nào để áp mã.</div>
                    ) : (
                      categoryOptions.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 rounded-md px-1 py-1">
                          <Checkbox
                            checked={form.category_ids.includes(category.id)}
                            onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                          />
                          <span className="text-sm">{category.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo mã giảm giá"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
