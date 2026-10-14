"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

import { ORDER_RANGE_OPTIONS, type OrderRangeKey } from "./range-options";

export function OrdersRangeFilter({ value }: { value: OrderRangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = (key: OrderRangeKey) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("range", key);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground mr-1 text-sm">Hiển thị đơn:</span>
      {ORDER_RANGE_OPTIONS.map((option) => (
        <Button
          key={option.key}
          size="sm"
          variant={option.key === value ? "default" : "outline"}
          onClick={() => select(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
