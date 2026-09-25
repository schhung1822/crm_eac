"use client";

import { RankedBarList, ReportCard } from "./report-card";
import { brandItems, productItems } from "./report-items";

type BrandOrdersItem = { stage: string; value: number };
type ProductRankItem = { product: string; quantity: number; revenue: number };

export function BrandOrdersCard({ brands, totalOrders }: { brands: BrandOrdersItem[]; totalOrders: number }) {
  return (
    <ReportCard title="Thương hiệu theo số đơn" description="Tỷ lệ trên tổng số đơn trong kỳ">
      <RankedBarList emptyText="Chưa có dữ liệu đơn hàng theo thương hiệu." items={brandItems(brands, totalOrders)} />
    </ReportCard>
  );
}

export function TopProductsCard({ topProducts }: { topProducts: ProductRankItem[] }) {
  return (
    <ReportCard title="Sản phẩm bán chạy" description="Theo số lượng bán ra, kèm doanh thu">
      <RankedBarList emptyText="Chưa có dữ liệu sản phẩm bán chạy." items={productItems(topProducts)} />
    </ReportCard>
  );
}
