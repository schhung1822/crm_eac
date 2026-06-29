import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export async function requireCurrentUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/v2/login");
  }

  return currentUser;
}
