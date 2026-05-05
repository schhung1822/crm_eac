"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function toISO(date?: Date) {
  if (!date) {
    return "";
  }

  return format(date, "yyyy-MM-dd");
}

function fromISO(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const from = fromISO(searchParams.get("from"));
    const to = fromISO(searchParams.get("to"));

    return from ? { from, to } : undefined;
  });

  React.useEffect(() => {
    const from = fromISO(searchParams.get("from"));
    const to = fromISO(searchParams.get("to"));

    setRange(from ? { from, to } : undefined);
  }, [searchParams]);

  const label = React.useMemo(() => {
    if (range?.from && range.to) {
      return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;
    }

    if (range?.from) {
      return `${format(range.from, "dd/MM/yyyy")} - ...`;
    }

    return "Toàn bộ dữ liệu";
  }, [range]);

  const apply = (nextRange?: DateRange) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextRange?.from) {
      nextParams.set("from", toISO(nextRange.from));
    } else {
      nextParams.delete("from");
    }

    if (nextRange?.to) {
      nextParams.set("to", toISO(nextRange.to));
    } else {
      nextParams.delete("to");
    }

    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const quickSelect = (mode: "7d" | "30d" | "90d" | "thisMonth" | "ytd") => {
    const now = new Date();
    const from = new Date(now);

    if (mode === "7d") {
      from.setDate(now.getDate() - 7);
    }

    if (mode === "30d") {
      from.setDate(now.getDate() - 30);
    }

    if (mode === "90d") {
      from.setDate(now.getDate() - 90);
    }

    if (mode === "thisMonth") {
      from.setDate(1);
    }

    if (mode === "ytd") {
      from.setMonth(0, 1);
    }

    const nextRange: DateRange = { from, to: now };
    setRange(nextRange);
    apply(nextRange);
  };

  const clear = () => {
    setRange(undefined);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("from");
    nextParams.delete("to");
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start">
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex gap-2 pb-2">
            <Button size="sm" variant="secondary" onClick={() => quickSelect("7d")}>
              7 ngày
            </Button>
            <Button size="sm" variant="secondary" onClick={() => quickSelect("30d")}>
              30 ngày
            </Button>
            <Button size="sm" variant="secondary" onClick={() => quickSelect("90d")}>
              90 ngày
            </Button>
            <Button size="sm" variant="secondary" onClick={() => quickSelect("thisMonth")}>
              Tháng này
            </Button>
            <Button size="sm" variant="secondary" onClick={() => quickSelect("ytd")}>
              Từ đầu năm
            </Button>
          </div>

          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={(value) => {
              setRange(value);
            }}
            locale={vi}
            initialFocus
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="ghost" onClick={clear}>
              Xóa
            </Button>
            <Button size="sm" onClick={() => apply(range)} disabled={!range?.from}>
              Áp dụng
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
