import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";

type SectionCardsProps = {
  stats: {
    totalOrders: number;
    totalTienHang: number;
    totalThanhTien: number;
    totalQuantity: number;
  };
};

export const SectionCards = memo(function SectionCards({ stats }: SectionCardsProps) {
  const formatNumber = (n: number) => n.toLocaleString("vi-VN");
  const formatCurrency = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

  const cards = [
    { label: "Tổng đơn", value: formatNumber(stats.totalOrders) },
    { label: "Sản phẩm bán ra", value: formatNumber(stats.totalQuantity) },
    { label: "Tiền hàng", value: formatCurrency(stats.totalTienHang) },
    { label: "Thành tiền", value: formatCurrency(stats.totalThanhTien) },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs font-medium">{card.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
