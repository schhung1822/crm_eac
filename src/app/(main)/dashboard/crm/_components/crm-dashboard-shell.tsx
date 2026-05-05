"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

const CRMDashboardClient = dynamic(() => import("./crm-dashboard-client"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="bg-muted h-10 w-56 animate-pulse rounded-md" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-muted h-28 animate-pulse rounded-xl" />
        <div className="bg-muted h-28 animate-pulse rounded-xl" />
        <div className="bg-muted h-28 animate-pulse rounded-xl" />
      </div>
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </div>
  ),
});

export default function CRMDashboardShell(props: ComponentProps<typeof CRMDashboardClient>) {
  return <CRMDashboardClient {...props} />;
}
