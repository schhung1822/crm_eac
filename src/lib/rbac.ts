import type { NavGroup, NavMainItem } from "@/navigation/sidebar/sidebar-items";

export const APP_ROLES = ["admin", "store_owner", "editor", "user"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type SrxManagementSection = "website" | "news" | "ladipage" | "affiliate";

type RouteMatcher =
  | {
      type: "exact";
      value: string;
    }
  | {
      type: "prefix";
      value: string;
    };

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  store_owner: "Chủ cửa hàng",
  editor: "Biên tập viên",
  user: "User",
};

export const ROLE_OPTIONS: ReadonlyArray<{ value: AppRole; label: string }> = APP_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const EXACT = (value: string): RouteMatcher => ({ type: "exact", value });
const PREFIX = (value: string): RouteMatcher => ({ type: "prefix", value });

const ROLE_ROUTE_MATCHERS: Record<Exclude<AppRole, "admin">, RouteMatcher[]> = {
  store_owner: [
    EXACT("/"),
    EXACT("/account"),
    EXACT("/dashboard"),
    EXACT("/dashboard/default"),
    EXACT("/dashboard/srxvietnam"),
    EXACT("/other"),
    EXACT("/rules"),
    EXACT("/unauthorized"),
    PREFIX("/srx"),
  ],
  editor: [
    EXACT("/"),
    EXACT("/account"),
    EXACT("/dashboard"),
    EXACT("/dashboard/default"),
    EXACT("/other"),
    EXACT("/rules"),
    EXACT("/unauthorized"),
    PREFIX("/srx/ladipage-events"),
    PREFIX("/srx/news"),
    PREFIX("/srx/news_categories"),
    PREFIX("/srx/news_tags"),
  ],
  user: [
    EXACT("/"),
    EXACT("/account"),
    EXACT("/dashboard"),
    PREFIX("/dashboard/crm"),
    EXACT("/dashboard/default"),
    EXACT("/dashboard/srxvietnam"),
    PREFIX("/customers"),
    PREFIX("/events"),
    EXACT("/other"),
    PREFIX("/orders"),
    PREFIX("/products"),
    EXACT("/rules"),
    EXACT("/unauthorized"),
    PREFIX("/zalo-oa"),
  ],
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function matchesRoute(pathname: string, matcher: RouteMatcher): boolean {
  const currentPath = normalizePath(pathname);
  const expectedPath = normalizePath(matcher.value);

  if (matcher.type === "exact") {
    return currentPath === expectedPath;
  }

  return currentPath === expectedPath || currentPath.startsWith(`${expectedPath}/`);
}

export function isAppRole(value: string | null | undefined): value is AppRole {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  return APP_ROLES.some((role) => role === normalizedValue);
}

export function normalizeRole(value: string | null | undefined): AppRole {
  if (!value) {
    return "user";
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  return APP_ROLES.find((role) => role === normalizedValue) ?? "user";
}

export function getRoleLabel(value: string | null | undefined): string {
  return ROLE_LABELS[normalizeRole(value)];
}

export function getDefaultRouteForRole(value: string | null | undefined): string {
  const role = normalizeRole(value);

  switch (role) {
    case "store_owner":
      return "/dashboard/srxvietnam";
    case "editor":
      return "/srx/news";
    default:
      return "/dashboard/default";
  }
}

export function canCreateUsers(value: string | null | undefined): boolean {
  return normalizeRole(value) === "admin";
}

export function canManageSrxSection(value: string | null | undefined, section: SrxManagementSection): boolean {
  const role = normalizeRole(value);

  if (role === "admin" || role === "store_owner") {
    return true;
  }

  if (role === "editor") {
    return section === "news" || section === "ladipage";
  }

  return false;
}

export function inferSrxSectionFromPath(pathname: string): SrxManagementSection | null {
  const normalizedPath = normalizePath(pathname);

  if (
    normalizedPath.startsWith("/api/srx/news") ||
    normalizedPath.startsWith("/srx/news") ||
    normalizedPath.startsWith("/srx/news_categories") ||
    normalizedPath.startsWith("/srx/news_tags")
  ) {
    return "news";
  }

  if (normalizedPath.startsWith("/api/srx/ladipage-events") || normalizedPath.startsWith("/srx/ladipage-events")) {
    return "ladipage";
  }

  if (
    normalizedPath.startsWith("/api/srx/affiliate") ||
    normalizedPath.startsWith("/srx/affiliates") ||
    normalizedPath.startsWith("/srx/affiliate")
  ) {
    return "affiliate";
  }

  if (normalizedPath.startsWith("/api/srx/") || normalizedPath.startsWith("/srx/")) {
    return "website";
  }

  return null;
}

export function canAccessPath(value: string | null | undefined, pathname: string): boolean {
  const role = normalizeRole(value);

  if (role === "admin") {
    return true;
  }

  const normalizedPath = normalizePath(pathname);

  return ROLE_ROUTE_MATCHERS[role].some((matcher) => matchesRoute(normalizedPath, matcher));
}

export function filterSidebarGroupsByRole(groups: readonly NavGroup[], value: string | null | undefined): NavGroup[] {
  return groups
    .map((group) => {
      const nextItems = group.items
        .map((item) => {
          if (item.subItems?.length) {
            const nextSubItems = item.subItems.filter((subItem) => canAccessPath(value, subItem.url));

            if (!nextSubItems.length) {
              return null;
            }

            return {
              ...item,
              subItems: nextSubItems,
            };
          }

          if (item.url === "#" || !canAccessPath(value, item.url)) {
            return null;
          }

          return item;
        })
        .filter((item): item is NavMainItem => item !== null);

      if (!nextItems.length) {
        return null;
      }

      return {
        ...group,
        items: nextItems,
      };
    })
    .filter((group): group is NavGroup => group !== null);
}
