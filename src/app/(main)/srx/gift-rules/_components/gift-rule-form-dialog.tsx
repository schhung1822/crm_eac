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
  srxGiftRuleTypeValues,
  type SrxGiftRule,
  type SrxGiftRuleMutationInput,
} from "@/lib/srx-website.shared";

import { GiftRuleImageField } from "./gift-rule-image-field";

export type GiftVariantOption = {
  id: string;
  label: string;
  sku: string;
};

export type GiftProductOption = {
  id: string;
  label: string;
  sku: string;
  thumbnailUrl: string;
  variants: GiftVariantOption[];
};

type GiftRuleFormState = SrxGiftRuleMutationInput;

const compactGridClass = "grid grid-cols-2 gap-4 max-[520px]:grid-cols-1";
const noneValue = "__none__";

const emptyFormState: GiftRuleFormState = {
  name: "",
  description: "",
  rule_type: "order_subtotal",
  product_id: "",
  variant_id: "",
  min_quantity: 1,
  min_subtotal: "0",
  gift_product_id: "",
  gift_variant_id: "",
  gift_sku: "",
  gift_name: "",
  gift_variant_name: "",
  gift_quantity: 1,
  gift_img: "",
  limit_quantity: "",
  multiply_by_matched_quantity: false,
  priority: 0,
  starts_at: "",
  ends_at: "",
  is_active: true,
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

function buildFormState(giftRule: SrxGiftRule | null): GiftRuleFormState {
  if (!giftRule) {
    return emptyFormState;
  }

  return {
    name: giftRule.name,
    description: giftRule.description,
    rule_type: giftRule.rule_type,
    product_id: giftRule.product_id,
    variant_id: giftRule.variant_id,
    min_quantity: giftRule.min_quantity,
    min_subtotal: String(giftRule.min_subtotal),
    gift_product_id: giftRule.gift_product_id,
    gift_variant_id: giftRule.gift_variant_id,
    gift_sku: giftRule.gift_sku,
    gift_name: giftRule.gift_name,
    gift_variant_name: giftRule.gift_variant_name,
    gift_quantity: giftRule.gift_quantity,
    gift_img: giftRule.gift_img,
    limit_quantity: giftRule.limit_quantity === null ? "" : String(giftRule.limit_quantity),
    multiply_by_matched_quantity: giftRule.multiply_by_matched_quantity,
    priority: giftRule.priority,
    starts_at: toLocalDateTimeInput(giftRule.starts_at),
    ends_at: toLocalDateTimeInput(giftRule.ends_at),
    is_active: giftRule.is_active,
  };
}

function getRuleTypeLabel(value: GiftRuleFormState["rule_type"]): string {
  switch (value) {
    case "product_quantity":
      return "Theo số lượng sản phẩm";
    case "order_subtotal":
      return "Theo giá trị đơn hàng";
    default:
      return value;
  }
}

function getProductVariants(productOptions: GiftProductOption[], productId: string): GiftVariantOption[] {
  return productOptions.find((product) => product.id === productId)?.variants ?? [];
}

function findVariant(productOptions: GiftProductOption[], variantId: string): GiftVariantOption | undefined {
  return productOptions.flatMap((product) => product.variants).find((variant) => variant.id === variantId);
}

export function GiftRuleFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
  productOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxGiftRule | null;
  isSubmitting: boolean;
  onSubmit: (value: GiftRuleFormState) => Promise<void>;
  productOptions: GiftProductOption[];
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<GiftRuleFormState>(() => buildFormState(initialValue));
  const conditionVariants = React.useMemo(
    () => getProductVariants(productOptions, form.product_id),
    [form.product_id, productOptions],
  );
  const giftVariants = React.useMemo(
    () => getProductVariants(productOptions, form.gift_product_id),
    [form.gift_product_id, productOptions],
  );

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

  function selectGiftProduct(productId: string) {
    const nextProductId = productId === noneValue ? "" : productId;
    const product = productOptions.find((item) => item.id === nextProductId);

    setForm((current) => ({
      ...current,
      gift_product_id: nextProductId,
      gift_variant_id: "",
      gift_sku: product?.sku ?? current.gift_sku,
      gift_name: product?.label ?? current.gift_name,
      gift_variant_name: "",
      gift_img: product?.thumbnailUrl || current.gift_img,
    }));
  }

  function selectGiftVariant(variantId: string) {
    const nextVariantId = variantId === noneValue ? "" : variantId;
    const variant = findVariant(productOptions, nextVariantId);

    setForm((current) => ({
      ...current,
      gift_variant_id: nextVariantId,
      gift_sku: variant?.sku ?? current.gift_sku,
      gift_variant_name: variant?.label ?? "",
    }));
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[760px]">
        <DrawerHeader>
          <DrawerTitle>{initialValue ? "Sửa chương trình quà tặng" : "Thêm chương trình quà tặng"}</DrawerTitle>
          <DrawerDescription>Thiết lập điều kiện nhận quà và thông tin quà hiển thị trên website SRX.</DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="gift-rule-name">Tên chương trình</Label>
                  <Input
                    id="gift-rule-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-rule-type">Điều kiện</Label>
                  <Select
                    value={form.rule_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        rule_type: value as GiftRuleFormState["rule_type"],
                        product_id: value === "product_quantity" ? current.product_id : "",
                        variant_id: value === "product_quantity" ? current.variant_id : "",
                      }))
                    }
                  >
                    <SelectTrigger id="gift-rule-type">
                      <SelectValue placeholder="Chọn điều kiện" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxGiftRuleTypeValues.map((ruleType) => (
                        <SelectItem key={ruleType} value={ruleType}>
                          {getRuleTypeLabel(ruleType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gift-description">Mô tả</Label>
                <Textarea
                  id="gift-description"
                  className="min-h-20"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              {form.rule_type === "product_quantity" ? (
                <div className={compactGridClass}>
                  <div className="grid gap-2">
                    <Label htmlFor="condition-product">Sản phẩm điều kiện</Label>
                    <Select
                      value={form.product_id || noneValue}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          product_id: value === noneValue ? "" : value,
                          variant_id: "",
                        }))
                      }
                    >
                      <SelectTrigger id="condition-product">
                        <SelectValue placeholder="Tất cả sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>Tất cả sản phẩm</SelectItem>
                        {productOptions.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="condition-variant">Biến thể điều kiện</Label>
                    <Select
                      value={form.variant_id || noneValue}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, variant_id: value === noneValue ? "" : value }))
                      }
                      disabled={!form.product_id}
                    >
                      <SelectTrigger id="condition-variant">
                        <SelectValue placeholder="Tất cả biến thể" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>Tất cả biến thể</SelectItem>
                        {conditionVariants.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="min-quantity">Số lượng tối thiểu</Label>
                  <Input
                    id="min-quantity"
                    type="number"
                    min={1}
                    value={form.min_quantity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, min_quantity: Number(event.target.value || 1) }))
                    }
                    disabled={form.rule_type !== "product_quantity"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="min-subtotal">Giá trị đơn tối thiểu</Label>
                  <Input
                    id="min-subtotal"
                    type="number"
                    min={0}
                    step="1000"
                    value={form.min_subtotal}
                    onChange={(event) => setForm((current) => ({ ...current, min_subtotal: event.target.value }))}
                    disabled={form.rule_type !== "order_subtotal"}
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="gift-product">Sản phẩm quà tặng</Label>
                  <Select value={form.gift_product_id || noneValue} onValueChange={selectGiftProduct}>
                    <SelectTrigger id="gift-product">
                      <SelectValue placeholder="Chọn sản phẩm quà" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={noneValue}>Quà nhập tay</SelectItem>
                      {productOptions.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-variant">Biến thể quà tặng</Label>
                  <Select value={form.gift_variant_id || noneValue} onValueChange={selectGiftVariant}>
                    <SelectTrigger id="gift-variant">
                      <SelectValue placeholder="Chọn biến thể quà" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={noneValue}>Không chọn biến thể</SelectItem>
                      {giftVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="gift-name">Tên quà</Label>
                  <Input
                    id="gift-name"
                    value={form.gift_name}
                    onChange={(event) => setForm((current) => ({ ...current, gift_name: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-sku">SKU quà</Label>
                  <Input
                    id="gift-sku"
                    value={form.gift_sku}
                    onChange={(event) => setForm((current) => ({ ...current, gift_sku: event.target.value }))}
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="gift-variant-name">Tên biến thể quà</Label>
                  <Input
                    id="gift-variant-name"
                    value={form.gift_variant_name}
                    onChange={(event) => setForm((current) => ({ ...current, gift_variant_name: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-quantity">Số lượng quà</Label>
                  <Input
                    id="gift-quantity"
                    type="number"
                    min={1}
                    value={form.gift_quantity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, gift_quantity: Number(event.target.value || 1) }))
                    }
                  />
                </div>
              </div>

              <GiftRuleImageField
                disabled={isSubmitting}
                value={form.gift_img}
                onChange={(value) => setForm((current) => ({ ...current, gift_img: value }))}
              />

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="limit-quantity">Giới hạn số lượng quà</Label>
                  <Input
                    id="limit-quantity"
                    type="number"
                    min={0}
                    value={form.limit_quantity}
                    onChange={(event) => setForm((current) => ({ ...current, limit_quantity: event.target.value }))}
                    placeholder="Không giới hạn"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-priority">Ưu tiên</Label>
                  <Input
                    id="gift-priority"
                    type="number"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priority: Number(event.target.value || 0) }))
                    }
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="gift-starts">Bắt đầu</Label>
                  <Input
                    id="gift-starts"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gift-ends">Kết thúc</Label>
                  <Input
                    id="gift-ends"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked === true }))}
                  />
                  <span className="text-sm">Đang hoạt động</span>
                </label>

                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.multiply_by_matched_quantity}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, multiply_by_matched_quantity: checked === true }))
                    }
                  />
                  <span className="text-sm">Nhân quà theo số lượng đạt điều kiện</span>
                </label>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo chương trình"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
