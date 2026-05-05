"use client";

import Link from "next/link";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { SrxProduct } from "@/lib/srx-products.shared";

export function ProductRowActions({
  onDelete,
  product,
}: {
  onDelete: (product: SrxProduct) => Promise<void>;
  product: SrxProduct;
}) {
  return (
    <>
      <DropdownMenuLabel>Sản phẩm</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={`/srx/products/${product.id}`}>Xem sản phẩm</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/srx/products/${product.id}/edit`}>Sửa sản phẩm</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => void onDelete(product)}>
        Xóa sản phẩm
      </DropdownMenuItem>
    </>
  );
}
