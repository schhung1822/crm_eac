import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDefaultRouteForRole } from "@/lib/rbac";

export default async function Page() {
  const currentUser = await getCurrentUser();
  redirect(getDefaultRouteForRole(currentUser?.role));
}
