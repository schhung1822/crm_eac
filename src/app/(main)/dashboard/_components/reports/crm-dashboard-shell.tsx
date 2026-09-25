"use client";

import type { ComponentProps } from "react";

import dynamic from "next/dynamic";

function DashboardSkeleton() {
  return (
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
  );
}

const CRMB2bDashboardClient = dynamic(() => import("./crm-b2b-dashboard-client"), {
  ssr: false,
  loading: DashboardSkeleton,
});

const CRMB2cDashboardClient = dynamic(() => import("./crm-b2c-dashboard-client"), {
  ssr: false,
  loading: DashboardSkeleton,
});

export function CRMB2bDashboardShell(props: ComponentProps<typeof CRMB2bDashboardClient>) {
  return <CRMB2bDashboardClient {...props} />;
}

export function CRMB2cDashboardShell(props: ComponentProps<typeof CRMB2cDashboardClient>) {
  return <CRMB2cDashboardClient {...props} />;
}

const CustomerDashboardClient = dynamic(() => import("./customer-dashboard-client"), {
  ssr: false,
  loading: DashboardSkeleton,
});

export function CustomerDashboardShell(props: ComponentProps<typeof CustomerDashboardClient>) {
  return <CustomerDashboardClient {...props} />;
}
