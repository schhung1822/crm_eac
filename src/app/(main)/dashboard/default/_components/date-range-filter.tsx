"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Range = { from?: Date; to?: Date };

function toISO(d?: Date) {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

function fromISO(s?: string | null) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// Mặc định (khi URL chưa có filter) là tháng này, khớp với server trong page.tsx
function defaultRange(): Range {
  const now = new Date();
  return { from: startOfMonth(now), to: now };
}

function rangeFromParams(fromParam?: string | null, toParam?: string | null): Range {
  if (!fromParam && !toParam) return defaultRange();
  return { from: fromISO(fromParam), to: fromISO(toParam) };
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [range, setRange] = React.useState<Range>(() => rangeFromParams(sp.get("from"), sp.get("to")));

  React.useEffect(() => {
    setRange(rangeFromParams(sp.get("from"), sp.get("to")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get("from"), sp.get("to")]);

  const label = React.useMemo(() => {
    if (range.from && range.to) {
      return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;
    }
    if (range.from) return `${format(range.from, "dd/MM/yyyy")} - ...`;
    return "Lọc theo thời gian";
  }, [range]);

  const apply = (r: Range) => {
    const params = new URLSearchParams(sp.toString());

    if (r.from) params.set("from", toISO(r.from));
    else params.delete("from");

    if (r.to) params.set("to", toISO(r.to));
    else params.delete("to");

    router.replace(`${pathname}?${params.toString()}`);
  };

  const quick = (mode: "7d" | "30d" | "90d" | "ytd" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    let start = new Date(now);
    let end = now;

    if (mode === "7d") start.setDate(now.getDate() - 7);
    if (mode === "30d") start.setDate(now.getDate() - 30);
    if (mode === "90d") start.setDate(now.getDate() - 90);

    if (mode === "thisMonth") {
      start = startOfMonth(now);
    }

    if (mode === "lastMonth") {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = prevMonth;
      end = endOfMonth(prevMonth);
    }

    if (mode === "ytd") {
      start.setMonth(0, 1);
    }

    const r = { from: start, to: end };
    setRange(r);
    apply(r);
  };

  // Xoá filter trên URL => quay lại mặc định (tháng này)
  const clear = () => {
    setRange(defaultRange());
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    router.replace(`${pathname}?${params.toString()}`);
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
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Từ ngày</span>
              <Calendar
                mode="single"
                selected={range.from}
                onSelect={(d) => setRange({ ...range, from: d })}
                disabled={(date) => (range.to ? date > range.to : false)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Đến ngày</span>
              <Calendar
                mode="single"
                selected={range.to}
                onSelect={(d) => setRange({ ...range, to: d })}
                disabled={(date) => (range.from ? date < range.from : false)}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            <Button size="sm" onClick={() => apply(range)} className="w-full">
              Áp dụng
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" onClick={() => quick("7d")}>
        7 ngày
      </Button>
      <Button variant="outline" size="sm" onClick={() => quick("30d")}>
        30 ngày
      </Button>
      <Button variant="outline" size="sm" onClick={() => quick("thisMonth")}>
        Tháng này
      </Button>
      <Button variant="outline" size="sm" onClick={() => quick("lastMonth")}>
        Tháng trước
      </Button>
      <Button variant="outline" size="sm" onClick={() => quick("ytd")}>
        Năm này
      </Button>

      {(sp.get("from") ?? sp.get("to")) && (
        <Button variant="secondary" size="sm" onClick={clear}>
          Xóa
        </Button>
      )}
    </div>
  );
}
