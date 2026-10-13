"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  formatVnd,
  srxLuckyWheelDiscountTypeLabels,
  srxLuckyWheelDiscountTypeValues,
  type SrxLuckyWheelPrizeType,
  type SrxLuckyWheelVoucherConfig,
} from "@/lib/srx-lucky-wheel.shared";

type DiscountType = SrxLuckyWheelVoucherConfig["discount_type"];

/** Ô nhập dạng chuỗi; chuỗi rỗng = không đặt. */
export type VoucherFormState = {
  discount_type: DiscountType;
  discount_value: string;
  max_discount_amount: string;
  min_order_amount: string;
  stack_with_public: boolean;
};

export function buildVoucherFormState(config: SrxLuckyWheelVoucherConfig | null): VoucherFormState {
  return {
    discount_type: config?.discount_type ?? "fixed_amount",
    discount_value: config ? String(config.discount_value) : "",
    max_discount_amount: config?.max_discount_amount ? String(config.max_discount_amount) : "",
    min_order_amount: config?.min_order_amount ? String(config.min_order_amount) : "",
    stack_with_public: config?.stack_with_public ?? false,
  };
}

function toAmount(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export function toVoucherConfig(state: VoucherFormState): SrxLuckyWheelVoucherConfig {
  return {
    discount_type: state.discount_type,
    discount_value: Number(state.discount_value || 0),
    max_discount_amount: state.discount_type === "percentage" ? toAmount(state.max_discount_amount) : null,
    min_order_amount: toAmount(state.min_order_amount),
    stack_with_public: state.stack_with_public,
  };
}

/** Câu tóm tắt cho admin xem nhanh khách sẽ nhận gì. */
function describeVoucher(state: VoucherFormState): string {
  const value = Number(state.discount_value || 0);

  if (!(value > 0)) {
    return "Nhập giá trị giảm để xem trước.";
  }

  const amount = state.discount_type === "percentage" ? `${value}%` : formatVnd(value);
  const cap =
    state.discount_type === "percentage" && Number(state.max_discount_amount) > 0
      ? `, tối đa ${formatVnd(Number(state.max_discount_amount))}`
      : "";
  const condition =
    Number(state.min_order_amount) > 0 ? `đơn hàng từ ${formatVnd(Number(state.min_order_amount))}` : "mọi đơn hàng";

  const stacking = state.stack_with_public ? " Dùng chung được với 1 mã chung." : " Phải dùng một mình.";

  return `Khách nhận mã riêng giảm ${amount}${cap} cho ${condition}.${stacking}`;
}

function AmountField({
  id,
  label,
  onChange,
  placeholder,
  suffix,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-muted-foreground shrink-0 text-sm">{suffix}</span>
      </div>
    </div>
  );
}

function VoucherConfigFields({
  onChange,
  value,
}: {
  onChange: (patch: Partial<VoucherFormState>) => void;
  value: VoucherFormState;
}) {
  const isPercentage = value.discount_type === "percentage";

  return (
    <div className="grid gap-4 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium">Voucher tự sinh</div>
        <p className="text-muted-foreground text-xs leading-5">
          Mỗi lần trúng, hệ thống tạo một mã riêng 8 chữ số ngẫu nhiên không trùng mã có sẵn, chỉ dùng được 1 lần, hiệu
          lực từ lúc trúng tới hết ngày sau 3 tháng. Mã được gửi qua tin ZBS tới Zalo của khách và lưu ở Mã giảm giá →
          tab Mã riêng.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="voucher-type">Kiểu giảm</Label>
          <Select
            value={value.discount_type}
            onValueChange={(next) => onChange({ discount_type: next as DiscountType })}
          >
            <SelectTrigger id="voucher-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {srxLuckyWheelDiscountTypeValues.map((type) => (
                <SelectItem key={type} value={type}>
                  {srxLuckyWheelDiscountTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AmountField
          id="voucher-value"
          label="Giá trị giảm"
          suffix={isPercentage ? "%" : "đ"}
          value={value.discount_value}
          onChange={(next) => onChange({ discount_value: next })}
        />
        {isPercentage ? (
          <AmountField
            id="voucher-max"
            label="Giảm tối đa"
            suffix="đ"
            placeholder="Không giới hạn"
            value={value.max_discount_amount}
            onChange={(next) => onChange({ max_discount_amount: next })}
          />
        ) : null}
        <AmountField
          id="voucher-min-order"
          label="Đơn tối thiểu"
          suffix="đ"
          placeholder="Mọi đơn hàng"
          value={value.min_order_amount}
          onChange={(next) => onChange({ min_order_amount: next })}
        />
      </div>

      <label className="flex items-start gap-3 rounded-md border bg-white/60 px-3 py-2.5 dark:bg-transparent">
        <Switch
          className="mt-0.5"
          checked={value.stack_with_public}
          onCheckedChange={(checked) => onChange({ stack_with_public: checked })}
        />
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Cho phép dùng chung với mã chung</span>
          <span className="text-muted-foreground text-xs leading-5">
            Khách áp được mã trúng thưởng cùng 1 mã chung (mã hiện trong giỏ hàng) trong cùng đơn hàng.
          </span>
        </span>
      </label>

      <p className="text-sm font-medium">{describeVoucher(value)}</p>
    </div>
  );
}

/** Phần "khách nhận được gì" của form phần thưởng, đổi theo loại phần thưởng. */
export function PrizeRewardFields({
  claimInstructions,
  onClaimInstructionsChange,
  onRewardCodeChange,
  onVoucherChange,
  prizeType,
  rewardCode,
  voucher,
}: {
  claimInstructions: string;
  onClaimInstructionsChange: (value: string) => void;
  onRewardCodeChange: (value: string) => void;
  onVoucherChange: (patch: Partial<VoucherFormState>) => void;
  prizeType: SrxLuckyWheelPrizeType;
  rewardCode: string;
  voucher: VoucherFormState;
}) {
  if (prizeType === "no_prize") {
    return null;
  }

  return (
    <>
      {prizeType === "voucher" ? (
        <VoucherConfigFields value={voucher} onChange={onVoucherChange} />
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="prize-code">Mã thưởng</Label>
          <Input
            id="prize-code"
            maxLength={100}
            value={rewardCode}
            placeholder="Không bắt buộc"
            onChange={(event) => onRewardCodeChange(event.target.value)}
          />
          <p className="text-muted-foreground text-xs leading-5">
            Chỉ hiện cho khách vừa trúng (kèm nút sao chép), vd. mã đổi quà tại cửa hàng.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="prize-claim">Hướng dẫn nhận thưởng</Label>
        <Textarea
          id="prize-claim"
          rows={3}
          maxLength={500}
          value={claimInstructions}
          placeholder={
            prizeType === "voucher"
              ? "Để trống: “Nhập mã ở bước thanh toán trên website. Mỗi mã chỉ dùng được 1 lần.”"
              : "VD: Nhân viên SRX sẽ liên hệ để gửi quà trong 3 ngày."
          }
          onChange={(event) => onClaimInstructionsChange(event.target.value)}
        />
      </div>
    </>
  );
}
