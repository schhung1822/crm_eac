import { ReactNode } from "react";

import { requireCurrentUser } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireCurrentUser();

  return children;
}
