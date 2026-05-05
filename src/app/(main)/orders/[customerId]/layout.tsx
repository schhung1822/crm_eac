import { ReactNode } from "react";

import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEFAULT_CONTENT_LAYOUT, DEFAULT_SIDEBAR_OPEN } from "@/lib/default-layout-preferences";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";
import { CONTENT_LAYOUT_VALUES, type ContentLayout } from "@/types/preferences/layout";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false" && DEFAULT_SIDEBAR_OPEN;

  const [contentLayout] = await Promise.all([
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, DEFAULT_CONTENT_LAYOUT),
  ]);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarInset
        data-content-layout={contentLayout}
        className={cn(
          "data-[content-layout=centered]:!mx-auto data-[content-layout=centered]:max-w-screen-2xl",
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <div className="h-full">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
