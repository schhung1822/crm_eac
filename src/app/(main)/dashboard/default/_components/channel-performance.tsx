import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { ChannelSummary } from "./types";

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export function ChannelPerformance({ channels }: { channels: ChannelSummary[] }) {
  const topChannel = channels.at(0);
  const totals = channels.reduce(
    (result, channel) => ({
      orders: result.orders + channel.order_count,
      quantity: result.quantity + channel.quantity,
      goodsValue: result.goodsValue + channel.tien_hang,
      discount: result.discount + channel.giam_gia,
      revenue: result.revenue + channel.thanh_tien,
    }),
    { orders: 0, quantity: 0, goodsValue: 0, discount: 0, revenue: 0 },
  );
  const discountRate = totals.goodsValue > 0 ? (totals.discount / totals.goodsValue) * 100 : 0;
  const totalAverageOrderValue = totals.orders > 0 ? totals.revenue / totals.orders : 0;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>Hiệu suất theo kênh bán · Đơn hoàn thành</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="bg-muted/35 grid gap-4 rounded-xl border p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium">Tiền hàng trước giảm</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(totals.goodsValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Tổng giảm giá</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(totals.discount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Tỷ lệ giảm giá</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {discountRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Kênh dẫn đầu</p>
            <p className="mt-1 text-lg font-semibold">{topChannel?.kenh_ban ?? "Chưa có dữ liệu"}</p>
          </div>
        </div>

        {channels.length === 0 ? (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm">
            Chưa có dữ liệu kênh bán trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Kênh bán</TableHead>
                  <TableHead className="text-right">Số đơn</TableHead>
                  <TableHead className="text-right">Sản phẩm</TableHead>
                  <TableHead className="text-right">TB / đơn</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead className="pr-4 text-right">Tỷ trọng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => {
                  const averageOrderValue = channel.order_count > 0 ? channel.thanh_tien / channel.order_count : 0;
                  const revenueShare = totals.revenue > 0 ? (channel.thanh_tien / totals.revenue) * 100 : 0;

                  return (
                    <TableRow key={channel.kenh_ban}>
                      <TableCell className="pl-4 font-medium">{channel.kenh_ban}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channel.order_count.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channel.quantity.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(averageOrderValue)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(channel.thanh_tien)}
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">
                        {revenueShare.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="pl-4 font-semibold">Tổng cộng</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totals.orders.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totals.quantity.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totalAverageOrderValue)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totals.revenue)}
                  </TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums">
                    {totals.revenue > 0 ? "100%" : "0%"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
