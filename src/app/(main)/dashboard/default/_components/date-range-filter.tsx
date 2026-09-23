"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Range = { from?: Date; to?: Date };

const PRESET_OPTIONS = [
  { mode: "7d", label: "7 ngày" },
  { mode: "30d", label: "30 ngày" },
  { mode: "thisMonth", label: "Tháng này" },
  { mode: "lastMonth", label: "Tháng trước" },
  { mode: "ytd", label: "Năm này" },
] as const;

type PresetMode = (typeof PRESET_OPTIONS)[number]["mode"];

const ACTIVE_FILTER_CLASS =
  "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground focus-visible:ring-primary/40";

function toISO(d?: Date) {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

function fromISO(s?: string | null) {
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00`);
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

function presetRange(mode: PresetMode, now = new Date()): Range {
  let start = new Date(now);
  let end = now;

  if (mode === "7d") start.setDate(now.getDate() - 6);
  if (mode === "30d") start.setDate(now.getDate() - 29);
  if (mode === "thisMonth") start = startOfMonth(now);

  if (mode === "lastMonth") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start = previousMonth;
    end = endOfMonth(previousMonth);
  }

  if (mode === "ytd") start.setMonth(0, 1);

  return { from: start, to: end };
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const fromParam = sp.get("from");
  const toParam = sp.get("to");

  const [range, setRange] = React.useState<Range>(() => rangeFromParams(fromParam, toParam));
  const [isOpen, setIsOpen] = React.useState(false);
  const appliedRange = React.useMemo(() => rangeFromParams(fromParam, toParam), [fromParam, toParam]);

  const activePreset = React.useMemo(() => {
    const appliedFrom = toISO(appliedRange.from);
    const appliedTo = toISO(appliedRange.to);
    const now = new Date();

    return (
      PRESET_OPTIONS.find(({ mode }) => {
        const preset = presetRange(mode, now);
        return toISO(preset.from) === appliedFrom && toISO(preset.to) === appliedTo;
      })?.mode ?? null
    );
  }, [appliedRange]);

  const isCustomRange = Boolean(appliedRange.from ?? appliedRange.to) && activePreset === null;

  React.useEffect(() => {
    setRange(rangeFromParams(fromParam, toParam));
  }, [fromParam, toParam]);

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

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setIsOpen(false);
  };

  const quick = (mode: PresetMode) => {
    const r = presetRange(mode);
    setRange(r);
    apply(r);
  };

  // Xoá filter trên URL => quay lại mặc định (tháng này)
  const clear = () => {
    setRange(defaultRange());
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="bg-background/80 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border p-1 shadow-sm backdrop-blur">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            aria-pressed={isCustomRange}
            className={cn(
              "focus-visible:ring-primary/40 max-w-full justify-start gap-2 px-3",
              isCustomRange && ACTIVE_FILTER_CLASS,
            )}
          >
            {label}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="max-h-[80vh] w-auto max-w-[calc(100vw-2rem)] overflow-auto p-3" align="end">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Từ ngày</span>
              <Calendar
                mode="single"
                selected={range.from}
                onSelect={(d) => setRange({ ...range, from: d })}
                disabled={(date) => date > new Date() || (range.to ? date > range.to : false)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Đến ngày</span>
              <Calendar
                mode="single"
                selected={range.to}
                onSelect={(d) => setRange({ ...range, to: d })}
                disabled={(date) => date > new Date() || (range.from ? date < range.from : false)}
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

      {PRESET_OPTIONS.map((option) => {
        const isActive = activePreset === option.mode;

        return (
          <Button
            key={option.mode}
            variant="ghost"
            size="sm"
            aria-pressed={isActive}
            className={cn("focus-visible:ring-primary/40", isActive && ACTIVE_FILTER_CLASS)}
            onClick={() => quick(option.mode)}
          >
            {option.label}
          </Button>
        );
      })}

      {(fromParam ?? toParam) && (
        <Button variant="ghost" size="sm" onClick={clear}>
          Đặt lại
        </Button>
      )}
    </div>
  );
}
