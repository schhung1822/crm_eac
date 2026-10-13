/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Gift, PencilLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeWinRates,
  formatVnd,
  isPrizeDrawable,
  parseSrxLuckyWheelPrize,
  srxLuckyWheelPrizeTypeLabels,
  type SrxLuckyWheelPrize,
  type SrxLuckyWheelPrizeInput,
} from "@/lib/srx-lucky-wheel.shared";

import { PrizeFormDrawer } from "./prize-form-drawer";

function sortPrizes(prizes: SrxLuckyWheelPrize[]): SrxLuckyWheelPrize[] {
  return [...prizes].sort((left, right) =>
    left.sort_order !== right.sort_order ? left.sort_order - right.sort_order : Number(left.id) - Number(right.id),
  );
}

/** Dòng mô tả ngắn phần khách nhận được. */
function describeReward(prize: SrxLuckyWheelPrize): string {
  const config = prize.voucher_config;

  if (prize.prize_type === "voucher") {
    if (!config) {
      return " · Chưa cấu hình mức giảm, hãy sửa lại";
    }

    const amount =
      config.discount_type === "percentage" ? `${config.discount_value}%` : formatVnd(config.discount_value);
    const condition = config.min_order_amount ? ` cho đơn từ ${formatVnd(config.min_order_amount)}` : "";

    return ` · Mã 8 số giảm ${amount}${condition}`;
  }

  return prize.reward_code ? ` · Mã: ${prize.reward_code}` : "";
}

function formatRate(rate: number): string {
  if (rate === 0) {
    return "0%";
  }

  return `${rate < 1 ? rate.toFixed(2) : rate.toFixed(1)}%`;
}

function getPrizeStatus(prize: SrxLuckyWheelPrize): { label: string; tone: "default" | "secondary" | "outline" } {
  if (!prize.is_active) {
    return { label: "Đang ẩn", tone: "secondary" };
  }

  if (prize.stock_total !== null && prize.stock_used >= prize.stock_total) {
    return { label: "Đã phát hết", tone: "outline" };
  }

  if (prize.weight === 0) {
    return { label: "Chỉ trưng bày", tone: "outline" };
  }

  return { label: "Đang trúng được", tone: "default" };
}

function PrizeRow({
  prize,
  rate,
  onDelete,
  onEdit,
}: {
  prize: SrxLuckyWheelPrize;
  rate: number;
  onDelete: (prize: SrxLuckyWheelPrize) => void;
  onEdit: (prize: SrxLuckyWheelPrize) => void;
}) {
  const status = getPrizeStatus(prize);

  return (
    <div className="flex gap-4 rounded-lg border p-3">
      <div className="bg-muted h-20 w-16 shrink-0 overflow-hidden rounded-md border">
        {prize.image_url ? <img src={prize.image_url} alt={prize.name} className="size-full object-cover" /> : null}
      </div>

      <div className="grid min-w-0 flex-1 content-start gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{prize.name}</span>
          <Badge variant={status.tone}>{status.label}</Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          {srxLuckyWheelPrizeTypeLabels[prize.prize_type]}
          {describeReward(prize)}
        </div>
        <div className="text-muted-foreground text-xs">
          Trọng số {prize.weight} · Đã phát {prize.stock_used}
          {prize.stock_total === null ? " (không giới hạn)" : `/${prize.stock_total}`} · Thứ tự {prize.sort_order}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-right">
          <div
            className={`text-lg font-semibold tabular-nums ${isPrizeDrawable(prize) ? "" : "text-muted-foreground"}`}
          >
            {formatRate(rate)}
          </div>
          <div className="text-muted-foreground text-[11px]">tỷ lệ trúng</div>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(prize)}>
            <PencilLine className="size-4" />
            Sửa
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(prize)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LuckyWheelPrizesCard({ initialPrizes }: { initialPrizes: SrxLuckyWheelPrize[] }) {
  const [prizes, setPrizes] = React.useState(() => sortPrizes(initialPrizes));
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingPrize, setEditingPrize] = React.useState<SrxLuckyWheelPrize | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const winRates = React.useMemo(() => computeWinRates(prizes), [prizes]);
  const visibleCount = prizes.filter((prize) => prize.is_active).length;
  const drawableCount = prizes.filter(isPrizeDrawable).length;
  const nextSortOrder = prizes.length ? Math.max(...prizes.map((prize) => prize.sort_order)) + 1 : 0;

  function openForm(prize: SrxLuckyWheelPrize | null) {
    setEditingPrize(prize);
    setFormOpen(true);
  }

  async function handleSubmit(value: SrxLuckyWheelPrizeInput) {
    try {
      setIsSubmitting(true);

      const response = await fetch(
        editingPrize ? `/api/srx/lucky-wheel/prizes/${editingPrize.id}` : "/api/srx/lucky-wheel/prizes",
        {
          method: editingPrize ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu phần thưởng");
      }

      const saved = parseSrxLuckyWheelPrize(result.prize);

      setPrizes((current) =>
        sortPrizes(
          editingPrize ? current.map((prize) => (prize.id === saved.id ? saved : prize)) : [...current, saved],
        ),
      );
      toast.success(editingPrize ? "Đã cập nhật phần thưởng" : "Đã thêm phần thưởng");
      setFormOpen(false);
      setEditingPrize(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu phần thưởng");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(prize: SrxLuckyWheelPrize) {
    const warning =
      prize.win_count > 0
        ? `Xóa phần thưởng "${prize.name}"? Lịch sử ${prize.win_count} lượt đã trúng vẫn được giữ. Nếu chỉ muốn tạm ngưng, hãy tắt "Hiện trên vòng quay".`
        : `Xóa phần thưởng "${prize.name}"?`;

    if (!window.confirm(warning)) {
      return;
    }

    try {
      const response = await fetch(`/api/srx/lucky-wheel/prizes/${prize.id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể xóa phần thưởng");
      }

      setPrizes((current) => current.filter((entry) => entry.id !== prize.id));
      toast.success("Đã xóa phần thưởng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa phần thưởng");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-4" />
          Phần thưởng
        </CardTitle>
        <CardDescription>
          Đang hiện {visibleCount}/{prizes.length} phần thưởng trên vòng quay, {drawableCount} phần thưởng có thể trúng.
          Tỷ lệ trúng được tính lại tự động mỗi khi đổi trọng số hoặc một phần thưởng phát hết.
        </CardDescription>
        <CardAction>
          <Button type="button" onClick={() => openForm(null)}>
            <Plus className="size-4" />
            Thêm phần thưởng
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-3">
        {drawableCount === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm leading-6">
            {visibleCount === 0
              ? "Chưa có phần thưởng nào hiện trên vòng quay: website sẽ ẩn nút vòng quay."
              : "Không còn phần thưởng nào trúng được (trọng số 0 hoặc đã phát hết): khách bấm quay sẽ nhận thông báo tạm hết quà."}
          </div>
        ) : null}

        {prizes.map((prize) => (
          <PrizeRow
            key={prize.id}
            prize={prize}
            rate={winRates.get(prize.id) ?? 0}
            onEdit={openForm}
            onDelete={(target) => void handleDelete(target)}
          />
        ))}
      </CardContent>

      <PrizeFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingPrize}
        nextSortOrder={nextSortOrder}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
