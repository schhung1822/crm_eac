"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type QuickMode = "7d" | "30d" | "90d" | "thisMonth" | "ytd";

const quickOptions: Array<{ mode: QuickMode; label: string }> = [
  { mode: "7d", label: "7 ngày" },
  { mode: "30d", label: "30 ngày" },
  { mode: "90d", label: "90 ngày" },
  { mode: "thisMonth", label: "Tháng này" },
  { mode: "ytd", label: "Từ đầu năm" },
];

function toISO(date: Date) {
  return format(date, "yyyy-MM-dd");
}

// Đọc yyyy-MM-dd theo giờ địa phương, tránh lệch ngày do múi giờ UTC.
function fromISO(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function rangeFromParams(searchParams: URLSearchParams): DateRange | undefined {
  const from = fromISO(searchParams.get("from"));
  const to = fromISO(searchParams.get("to"));

  return from ? { from, to: to ?? from } : undefined;
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(() => rangeFromParams(searchParams));

  React.useEffect(() => {
    setRange(rangeFromParams(searchParams));
  }, [searchParams]);

  const label = React.useMemo(() => {
    if (!range?.from) {
      return "Toàn bộ thời gian";
    }

    const start = format(range.from, "dd/MM/yyyy");
    const end = range.to ? format(range.to, "dd/MM/yyyy") : start;

    return start === end ? start : `${start} - ${end}`;
  }, [range]);

  const navigate = (nextRange?: DateRange) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextRange?.from) {
      // Chỉ chọn một ngày thì hiểu là khoảng một ngày, không phải "từ ngày đó trở đi".
      nextParams.set("from", toISO(nextRange.from));
      nextParams.set("to", toISO(nextRange.to ?? nextRange.from));
    } else {
      nextParams.delete("from");
      nextParams.delete("to");
    }

    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    setOpen(false);
  };

  const quickSelect = (mode: QuickMode) => {
    const today = new Date();
    const startByMode = new Map<QuickMode, Date>([
      ["7d", subDays(today, 6)],
      ["30d", subDays(today, 29)],
      ["90d", subDays(today, 89)],
      ["thisMonth", startOfMonth(today)],
      ["ytd", startOfYear(today)],
    ]);
    const from = startByMode.get(mode) ?? today;

    const nextRange: DateRange = { from, to: today };
    setRange(nextRange);
    navigate(nextRange);
  };

  const clear = () => {
    setRange(undefined);
    navigate(undefined);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-start gap-2 font-normal">
            <CalendarDays className="text-muted-foreground size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex flex-wrap gap-1.5 pb-3">
            {quickOptions.map((option) => (
              <Button key={option.mode} size="sm" variant="secondary" onClick={() => quickSelect(option.mode)}>
                {option.label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={setRange}
            locale={vi}
            defaultMonth={range?.from}
            initialFocus
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="ghost" onClick={clear}>
              Xóa lọc
            </Button>
            <Button size="sm" onClick={() => navigate(range)} disabled={!range?.from}>
              Áp dụng
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {range?.from ? (
        <Button variant="ghost" size="icon" className="size-8" onClick={clear} aria-label="Xóa lọc ngày">
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
