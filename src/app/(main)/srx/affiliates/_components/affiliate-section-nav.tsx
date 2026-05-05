"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/srx/affiliates/manage",
    label: "Quản lý affiliate",
    description: "Tài khoản và trạng thái hoạt động",
  },
  {
    href: "/srx/affiliates/approval",
    label: "Phê duyệt hồ sơ",
    description: "Danh sách hồ sơ từ affiliate_applications",
  },
  {
    href: "/srx/affiliates/commission",
    label: "Thiết lập hoa hồng",
    description: "Chính sách chi trả và cookie",
  },
] as const;

export function AffiliateSectionNav() {
  const pathname = usePathname();

  return (
    <div className="bg-card/70 flex flex-wrap gap-2 rounded-2xl border p-2">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "min-w-[220px] flex-1 rounded-xl border px-4 py-3 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground border-transparent",
            )}
          >
            <div className="font-medium">{item.label}</div>
            <div className="text-xs">{item.description}</div>
          </Link>
        );
      })}
    </div>
  );
}
