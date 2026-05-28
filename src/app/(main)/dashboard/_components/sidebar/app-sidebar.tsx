import Link from "next/link";

import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sidebarMenuButtonVariants } from "@/components/ui/sidebar-menu-button-variants";
import { APP_CONFIG } from "@/config/app-config";
import { getPendingSrxAffiliateApplicationCount } from "@/lib/srx-affiliates";
import { getPendingSrxOrderCount } from "@/lib/srx-orders";
import { cn } from "@/lib/utils";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [pendingOrderCount, pendingAffiliateApplicationCount] = await Promise.all([
    getPendingSrxOrderCount(),
    getPendingSrxAffiliateApplicationCount(),
  ]);

  const indicators = {
    "/srx/orders": pendingOrderCount > 0,
    "/srx/affiliates/approval": pendingAffiliateApplicationCount > 0,
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/events"
              data-slot="sidebar-menu-button"
              data-sidebar="menu-button"
              data-size="default"
              className={cn(
                sidebarMenuButtonVariants({ size: "default", variant: "default" }),
                "data-[slot=sidebar-menu-button]:!p-1.5",
              )}
            >
              <Command />
              <span className="text-base font-semibold">{APP_CONFIG.name}</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="nice-scroll max-h-[80vh] sm:max-h-[82vh]">
        <NavMain indicators={indicators} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
