"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  srxLuckyWheelPrizeTypeLabels,
  srxLuckyWheelPrizeTypeValues,
  type SrxLuckyWheelPrize,
  type SrxLuckyWheelPrizeInput,
  type SrxLuckyWheelPrizeType,
} from "@/lib/srx-lucky-wheel.shared";

import { PrizeImageField } from "./prize-image-field";
import {
  buildVoucherFormState,
  PrizeRewardFields,
  toVoucherConfig,
  type VoucherFormState,
} from "./prize-reward-fields";

type PrizeFormState = {
  name: string;
  description: string;
  image_url: string;
  prize_type: SrxLuckyWheelPrizeType;
  reward_code: string;
  claim_instructions: string;
  weight: string;
  /** Chuỗi rỗng = không giới hạn. */
  stock_total: string;
  sort_order: string;
  is_active: boolean;
  voucher: VoucherFormState;
};

function buildFormState(prize: SrxLuckyWheelPrize | null, nextSortOrder: number): PrizeFormState {
  if (!prize) {
    return {
      name: "",
      description: "",
      image_url: "",
      prize_type: "gift",
      reward_code: "",
      claim_instructions: "",
      weight: "10",
      stock_total: "",
      sort_order: String(nextSortOrder),
      is_active: true,
      voucher: buildVoucherFormState(null),
    };
  }

  return {
    name: prize.name,
    description: prize.description ?? "",
    image_url: prize.image_url,
    prize_type: prize.prize_type,
    reward_code: prize.reward_code ?? "",
    claim_instructions: prize.claim_instructions ?? "",
    weight: String(prize.weight),
    stock_total: prize.stock_total === null ? "" : String(prize.stock_total),
    sort_order: String(prize.sort_order),
    is_active: prize.is_active,
    voucher: buildVoucherFormState(prize.voucher_config),
  };
}

function toPrizeInput(form: PrizeFormState): SrxLuckyWheelPrizeInput {
  return {
    name: form.name,
    description: form.description || null,
    image_url: form.image_url,
    prize_type: form.prize_type,
    // Voucher dùng mã tự sinh cho từng lượt trúng nên không có mã cố định.
    reward_code: form.prize_type === "gift" ? form.reward_code || null : null,
    claim_instructions: form.prize_type === "no_prize" ? null : form.claim_instructions || null,
    weight: Number(form.weight || 0),
    stock_total: form.stock_total.trim() === "" ? null : Number(form.stock_total),
    sort_order: Number(form.sort_order || 0),
    is_active: form.is_active,
    voucher_config: form.prize_type === "voucher" ? toVoucherConfig(form.voucher) : null,
  };
}

export function PrizeFormDrawer({
  open,
  onOpenChange,
  initialValue,
  nextSortOrder,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxLuckyWheelPrize | null;
  nextSortOrder: number;
  isSubmitting: boolean;
  onSubmit: (value: SrxLuckyWheelPrizeInput) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<PrizeFormState>(() => buildFormState(initialValue, nextSortOrder));

  React.useEffect(() => {
    if (open) {
      setForm(buildFormState(initialValue, nextSortOrder));
    }
  }, [initialValue, nextSortOrder, open]);

  const handleChange = (patch: Partial<PrizeFormState>) => setForm((current) => ({ ...current, ...patch }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(toPrizeInput(form));
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[560px]">
        <DrawerHeader>
          <DrawerTitle>{initialValue ? "Sửa phần thưởng" : "Thêm phần thưởng"}</DrawerTitle>
          <DrawerDescription>
            Tên, ảnh (tỷ lệ 4:5) và mô tả hiện trên vòng quay. Tỷ lệ trúng, số lượng và mã thưởng chỉ hiện trong CRM.
          </DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div className="grid gap-2">
                  <Label htmlFor="prize-name">Tên phần thưởng</Label>
                  <Input
                    id="prize-name"
                    required
                    maxLength={150}
                    value={form.name}
                    placeholder="VD: Voucher 50K"
                    onChange={(event) => handleChange({ name: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prize-type">Loại</Label>
                  <Select
                    value={form.prize_type}
                    onValueChange={(value) => handleChange({ prize_type: value as SrxLuckyWheelPrizeType })}
                  >
                    <SelectTrigger id="prize-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {srxLuckyWheelPrizeTypeValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {srxLuckyWheelPrizeTypeLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prize-description">Mô tả (hiện khi khách rê chuột vào phần thưởng)</Label>
                <Textarea
                  id="prize-description"
                  rows={2}
                  maxLength={500}
                  value={form.description}
                  onChange={(event) => handleChange({ description: event.target.value })}
                />
              </div>

              <PrizeImageField
                disabled={isSubmitting}
                value={form.image_url}
                onChange={(value) => handleChange({ image_url: value })}
              />

              <div className="grid gap-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="text-sm font-medium">Tỷ lệ trúng (chỉ CRM thấy)</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="prize-weight">Trọng số</Label>
                    <Input
                      id="prize-weight"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.weight}
                      onChange={(event) => handleChange({ weight: event.target.value })}
                    />
                    <p className="text-muted-foreground text-xs leading-5">
                      Tỷ lệ = trọng số / tổng trọng số các phần thưởng còn trúng được. 0 = chỉ để trưng bày, không bao
                      giờ trúng.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="prize-stock">Số lượng phát</Label>
                    <Input
                      id="prize-stock"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="Không giới hạn"
                      value={form.stock_total}
                      onChange={(event) => handleChange({ stock_total: event.target.value })}
                    />
                    <p className="text-muted-foreground text-xs leading-5">
                      Phát hết thì phần thưởng vẫn hiện trên vòng quay nhưng không trúng nữa.
                      {initialValue ? ` Đã phát ${initialValue.stock_used}.` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <PrizeRewardFields
                prizeType={form.prize_type}
                rewardCode={form.reward_code}
                claimInstructions={form.claim_instructions}
                voucher={form.voucher}
                onRewardCodeChange={(value) => handleChange({ reward_code: value })}
                onClaimInstructionsChange={(value) => handleChange({ claim_instructions: value })}
                onVoucherChange={(patch) =>
                  setForm((current) => ({ ...current, voucher: { ...current.voucher, ...patch } }))
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="prize-sort">Thứ tự trên vòng quay</Label>
                  <Input
                    id="prize-sort"
                    type="number"
                    inputMode="numeric"
                    value={form.sort_order}
                    onChange={(event) => handleChange({ sort_order: event.target.value })}
                  />
                </div>
                <label className="flex items-center justify-between gap-4 self-end rounded-md border px-3 py-2.5">
                  <span className="text-sm font-medium">Hiện trên vòng quay</span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => handleChange({ is_active: checked })}
                  />
                </label>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Thêm phần thưởng"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
