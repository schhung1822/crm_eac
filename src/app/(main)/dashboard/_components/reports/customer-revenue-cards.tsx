"use client";

import { formatNumber, formatPercent } from "./crm-format";
import { EmptyState, REPORT_BODY_HEIGHT, ReportCard } from "./report-card";
import { SERIES_COLORS } from "./report-colors";

export type CustomerRetention = {
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatCustomers: number;
};

export function CustomerRetentionCard({ retention }: { retention: CustomerRetention }) {
  const { customers, newCustomers, returningCustomers, repeatCustomers } = retention;
  const composition = [
    {
      key: "new",
      label: "Khách mới",
      hint: "Đơn đầu tiên rơi vào kỳ này",
      value: newCustomers,
      color: SERIES_COLORS[0],
    },
    {
      key: "returning",
      label: "Khách quay lại",
      hint: "Đã từng mua trước kỳ này",
      value: returningCustomers,
      color: SERIES_COLORS[1],
    },
  ];

  return (
    <ReportCard title="Khách hàng mua trong kỳ" description="Nhận diện theo mã khách hoặc số điện thoại">
      {customers === 0 ? (
        <EmptyState>Chưa có dữ liệu khách hàng trong khoảng thời gian này.</EmptyState>
      ) : (
        <div className={`flex flex-col justify-between gap-5 ${REPORT_BODY_HEIGHT}`}>
          <div>
            <p className="text-4xl font-semibold tracking-tight">{formatNumber(customers)}</p>
            <p className="text-muted-foreground text-sm">khách hàng có đơn</p>
          </div>

          <div className="space-y-3">
            <div
              className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label="Khách mới và khách quay lại"
            >
              {composition
                .filter((item) => item.value > 0)
                .map((item) => (
                  <div
                    key={item.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(item.value / customers) * 100}%`, background: item.color }}
                  />
                ))}
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {composition.map((item) => (
                <li key={item.key} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <p className="pl-4.5 text-sm tabular-nums">
                    {formatNumber(item.value)}{" "}
                    <span className="text-muted-foreground text-xs">{formatPercent(item.value, customers)}</span>
                  </p>
                  <p className="text-muted-foreground pl-4.5 text-xs">{item.hint}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Tỷ lệ mua lặp lại</p>
              <p className="text-muted-foreground text-xs">
                {formatNumber(repeatCustomers)} khách có từ 2 đơn trong kỳ
              </p>
            </div>
            <p className="text-xl font-semibold">{formatPercent(repeatCustomers, customers)}</p>
          </div>
        </div>
      )}
    </ReportCard>
  );
}
