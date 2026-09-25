"use client";

import { formatCompactCurrency, formatCurrency, formatPercent } from "./crm-format";
import { FullValue } from "./full-value";
import { RankedBarList, ReportCard } from "./report-card";
import { buildChannelColors } from "./report-colors";
import { channelItems } from "./report-items";
import type { ChannelSummary } from "./schema";

/** Thanh 100% chia tỷ trọng, các đoạn cách nhau 2px. Chỉ dùng khi số kênh ít (≤ 6). */
function ShareBar({ segments }: { segments: Array<{ key: string; label: string; value: number; color: string }> }) {
  const total = segments.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  if (total <= 0) return null;

  return (
    <div
      className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
      role="img"
      aria-label="Tỷ trọng doanh thu theo kênh"
    >
      {segments
        .filter((item) => item.value > 0)
        .map((item) => (
          <div
            key={item.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
            title={`${item.label}: ${formatPercent(item.value, total)}`}
          />
        ))}
    </div>
  );
}

/**
 * Doanh thu theo kênh. `identityColors`: mỗi kênh một màu cố định + thanh tỷ trọng (B2C, ít kênh);
 * không bật thì mọi thanh cùng một màu (B2B, nhiều kênh).
 */
export function ChannelRevenueCard({
  title,
  channels,
  identityColors = false,
}: {
  title: string;
  channels: ChannelSummary[];
  identityColors?: boolean;
}) {
  const total = channels.reduce((sum, item) => sum + item.thanh_tien, 0);
  const colors = identityColors ? buildChannelColors(channels.map((item) => item.kenh_ban)) : undefined;

  return (
    <ReportCard
      title={title}
      description={
        <>
          Tổng <FullValue fullValue={formatCurrency(total)}>{formatCompactCurrency(total)}</FullValue>
        </>
      }
    >
      <div className="space-y-5">
        {colors && channels.length <= 6 ? (
          <ShareBar
            segments={channels.map((item) => ({
              key: item.kenh_ban,
              label: item.kenh_ban,
              value: item.thanh_tien,
              color: colors.get(item.kenh_ban) ?? "",
            }))}
          />
        ) : null}
        <RankedBarList items={channelItems(channels, colors)} emptyText="Chưa có dữ liệu doanh thu theo kênh bán." />
      </div>
    </ReportCard>
  );
}
