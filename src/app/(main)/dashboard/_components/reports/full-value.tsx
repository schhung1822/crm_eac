"use client";

import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Số đã làm tròn (vd. "170,32 tỷ"); rê chuột hoặc focus để xem số đầy đủ. */
export function FullValue({ fullValue, children }: { fullValue?: string; children: ReactNode }) {
  if (!fullValue) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="focus-visible:ring-ring cursor-help rounded-sm outline-none focus-visible:ring-2">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="tabular-nums">{fullValue}</TooltipContent>
    </Tooltip>
  );
}
