import { redirect } from "next/navigation";

import { getDefaultRouteForRole, normalizeRole } from "@/lib/rbac";
import { requireCurrentUser } from "@/lib/require-auth";

import { SystemMapView } from "./_components/system-map-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Proxy đã chặn theo role trong JWT; kiểm tra lại role mới nhất trong database vì sơ đồ lộ cấu trúc hệ thống.
  const currentUser = await requireCurrentUser();
  const role = normalizeRole(currentUser.role);

  if (role !== "admin") {
    redirect(getDefaultRouteForRole(role));
  }

  return <SystemMapView />;
}
