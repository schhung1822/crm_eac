import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export async function ensureAdminApiAccess(forbiddenMessage: string): Promise<NextResponse | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: forbiddenMessage }, { status: 403 });
  }

  return null;
}
