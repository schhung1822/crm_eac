import { memo } from "react";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import { FullValue } from "./full-value";

export type KpiCard = {
  label: string;
  value: string;
  /** Số đầy đủ khi `value` đã làm tròn: hiện thành dòng nhỏ bên dưới + tooltip khi rê chuột. */
  fullValue?: string;
  hint?: string;
  /** Giá trị kỳ này và kỳ trước để tính % thay đổi; bỏ trống thì không hiện so sánh. */
  comparison?: { current: number; previous: number; higherIsBetter?: boolean };
};

const DELTA_TONE = {
  flat: { className: "text-muted-foreground" },
  good: { className: "text-emerald-600 dark:text-emerald-400" },
  bad: { className: "text-rose-600 dark:text-rose-400" },
};

function formatChange(change: number) {
  const percent = Math.abs(change * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  return `${change > 0 ? "+" : "−"}${percent}%`;
}

/** % thay đổi so với kỳ trước: mũi tên + dấu + màu (xanh = tốt, đỏ = xấu theo `higherIsBetter`). */
function Delta({ current, previous, higherIsBetter = true }: NonNullable<KpiCard["comparison"]>) {
  if (!previous) return null;

  const change = (current - previous) / Math.abs(previous);

  if (Math.abs(change) < 0.0005) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", DELTA_TONE.flat.className)}>
        <Minus className="size-3.5" aria-hidden />
        0%
      </span>
    );
  }

  const Icon = change > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = change > 0 === higherIsBetter ? DELTA_TONE.good : DELTA_TONE.bad;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", tone.className)}>
      <Icon className="size-3.5" aria-hidden />
      {formatChange(change)}
    </span>
  );
}

/** Dải chỉ số: các ô chung một khung, ngăn bằng đường kẻ mảnh. */
export const SectionCards = memo(function SectionCards({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="bg-border grid grid-cols-1 gap-px overflow-hidden rounded-xl border @md/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-card flex flex-col gap-1.5 px-5 py-4">
          <p className="text-muted-foreground text-xs font-medium">{card.label}</p>
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              <FullValue fullValue={card.fullValue}>{card.value}</FullValue>
            </p>
            {card.fullValue ? (
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{card.fullValue}</p>
            ) : null}
          </div>
          {card.comparison?.previous ? (
            <div className="flex items-center gap-1.5">
              <Delta {...card.comparison} />
              <span className="text-muted-foreground text-xs">so với kỳ trước</span>
            </div>
          ) : null}
          {card.hint ? <p className="text-muted-foreground text-xs">{card.hint}</p> : null}
        </div>
      ))}
    </div>
  );
});
