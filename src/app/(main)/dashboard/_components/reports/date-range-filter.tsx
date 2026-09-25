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
  { mode: "all", label: "Tất cả" },
  { mode: "7d", label: "7 ngày" },
  { mode: "30d", label: "30 ngày" },
  { mode: "90d", label: "3 tháng" },
  { mode: "thisMonth", label: "Tháng này" },
  { mode: "ytd", label: "Năm này" },
] as const;

type PresetMode = (typeof PRESET_OPTIONS)[number]["mode"];

const ACTIVE_FILTER_CLASS =
  "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground focus-visible:ring-primary/40";

function toISO(date?: Date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function fromISO(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function rangeFromParams(from?: string | null, to?: string | null): Range {
  return { from: fromISO(from), to: fromISO(to) };
}

function presetRange(mode: PresetMode, now = new Date()): Range {
  if (mode === "all") return {};

  const start = new Date(now);
  if (mode === "7d") start.setDate(now.getDate() - 6);
  if (mode === "30d") start.setDate(now.getDate() - 29);
  if (mode === "90d") start.setDate(now.getDate() - 89);
  if (mode === "thisMonth") start.setDate(1);
  if (mode === "ytd") start.setMonth(0, 1);

  return { from: start, to: now };
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const [range, setRange] = React.useState<Range>(() => rangeFromParams(fromParam, toParam));
  const [isOpen, setIsOpen] = React.useState(false);
  const appliedRange = React.useMemo(() => rangeFromParams(fromParam, toParam), [fromParam, toParam]);

  const activePreset = React.useMemo(() => {
    if (!appliedRange.from && !appliedRange.to) return "all";

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
    if (range.from && range.to) return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;
    if (range.from) return `${format(range.from, "dd/MM/yyyy")} - ...`;
    return "Chọn khoảng ngày";
  }, [range]);

  const apply = (nextRange: Range) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextRange.from) params.set("from", toISO(nextRange.from));
    else params.delete("from");

    if (nextRange.to) params.set("to", toISO(nextRange.to));
    else params.delete("to");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setIsOpen(false);
  };

  const applyPreset = (mode: PresetMode) => {
    const nextRange = presetRange(mode);
    setRange(nextRange);
    apply(nextRange);
  };

  return (
    <div className="bg-background/80 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border p-1 shadow-sm backdrop-blur">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            aria-pressed={isCustomRange}
            className={cn(
              "focus-visible:ring-primary/40 max-w-full justify-start px-3",
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
                onSelect={(date) => setRange({ ...range, from: date })}
                disabled={(date) => date > new Date() || (range.to ? date > range.to : false)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Đến ngày</span>
              <Calendar
                mode="single"
                selected={range.to}
                onSelect={(date) => setRange({ ...range, to: date })}
                disabled={(date) => date > new Date() || (range.from ? date < range.from : false)}
              />
            </div>
          </div>
          <div className="mt-3 border-t pt-3">
            <Button size="sm" onClick={() => apply(range)} disabled={!range.from} className="w-full">
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
            onClick={() => applyPreset(option.mode)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
