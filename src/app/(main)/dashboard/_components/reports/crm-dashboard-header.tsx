"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CRM_SEGMENTS, type CrmSegment } from "@/lib/crm-segments";
import { cn } from "@/lib/utils";

import { DateRangeFilter } from "./date-range-filter";

const SEGMENT_ORDER: CrmSegment[] = ["b2b", "b2c"];

export function ReportHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="md:py-2">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          {children}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          </div>
        </div>
        <DateRangeFilter />
      </div>
    </section>
  );
}

export function CrmDashboardHeader({ segment }: { segment: CrmSegment }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const current = CRM_SEGMENTS[segment];

  return (
    <ReportHeader title={current.title} description={current.description}>
      <div className="bg-muted inline-flex rounded-lg p-1">
        {SEGMENT_ORDER.map((key) => (
          <Button
            key={key}
            asChild
            size="sm"
            variant="ghost"
            className={cn("h-7 px-4", key === segment && "bg-background hover:bg-background text-foreground shadow-sm")}
          >
            <Link href={query ? `${CRM_SEGMENTS[key].path}?${query}` : CRM_SEGMENTS[key].path}>
              {CRM_SEGMENTS[key].shortLabel}
            </Link>
          </Button>
        ))}
      </div>
    </ReportHeader>
  );
}
