"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatNumber } from "./crm-format";
import type { ChannelSummary } from "./schema";

type Props = {
  title: string;
  channels: ChannelSummary[];
};

type Column = {
  key: string;
  label: string;
  value: (row: ChannelSummary) => number;
  currency?: boolean;
};

const averageOrderValue = (row: ChannelSummary) => (row.order_count > 0 ? row.thanh_tien / row.order_count : 0);

const COLUMNS: Column[] = [
  { key: "orders", label: "Số đơn", value: (row) => row.order_count },
  { key: "quantity", label: "Sản phẩm bán ra", value: (row) => row.quantity },
  { key: "tien_hang", label: "Tiền hàng", value: (row) => row.tien_hang, currency: true },
  { key: "giam_gia", label: "Giảm giá", value: (row) => row.giam_gia, currency: true },
  { key: "aov", label: "Giá trị đơn TB", value: averageOrderValue, currency: true },
  { key: "thanh_tien", label: "Thành tiền", value: (row) => row.thanh_tien, currency: true },
];

function formatCell(value: number, currency?: boolean) {
  const text = formatNumber(Math.round(value));
  return currency ? `${text} ₫` : text;
}

/** Bảng số liệu theo kênh: hiển thị toàn bộ, không phân trang / sắp xếp; dòng cuối là tổng. */
export function TableCards({ title, channels }: Props) {
  const totals: ChannelSummary = channels.reduce(
    (sum, row) => ({
      kenh_ban: "Tổng",
      order_count: sum.order_count + row.order_count,
      quantity: sum.quantity + row.quantity,
      tien_hang: sum.tien_hang + row.tien_hang,
      giam_gia: sum.giam_gia + row.giam_gia,
      thanh_tien: sum.thanh_tien + row.thanh_tien,
    }),
    { kenh_ban: "Tổng", order_count: 0, quantity: 0, tien_hang: 0, giam_gia: 0, thanh_tien: 0 },
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {channels.length === 0 ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            Chưa có dữ liệu trong khoảng thời gian này.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground pl-5 text-xs font-medium">Kênh bán</TableHead>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.key}
                    className="text-muted-foreground text-right text-xs font-medium last:pr-5"
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((row) => (
                <TableRow key={row.kenh_ban}>
                  <TableCell className="pl-5 font-medium">{row.kenh_ban}</TableCell>
                  {COLUMNS.map((column) => (
                    <TableCell key={column.key} className="text-right tabular-nums last:pr-5">
                      {formatCell(column.value(row), column.currency)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            {channels.length > 1 ? (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="pl-5 font-semibold">Tổng</TableCell>
                  {COLUMNS.map((column) => (
                    <TableCell key={column.key} className="text-right font-semibold tabular-nums last:pr-5">
                      {formatCell(column.value(totals), column.currency)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
