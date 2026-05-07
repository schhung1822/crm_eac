import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { canCreateUsers, canManageSrxSection, inferSrxSectionFromPath, normalizeRole, type SrxManagementSection } from "@/lib/rbac";

function buildErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status });
}

export async function ensureAdminApiAccess(
  requestOrForbiddenMessage: NextRequest | string,
  maybeForbiddenMessage?: string,
): Promise<NextResponse | null> {
  const request = typeof requestOrForbiddenMessage === "string" ? null : requestOrForbiddenMessage;
  const forbiddenMessage =
    typeof requestOrForbiddenMessage === "string" ? requestOrForbiddenMessage : maybeForbiddenMessage ?? "Khong co quyen truy cap";
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return buildErrorResponse("Chua dang nhap", 401);
  }

  const role = normalizeRole(currentUser.role);
  const section = request ? inferSrxSectionFromPath(request.nextUrl.pathname) : null;

  if (section && canManageSrxSection(role, section)) {
    return null;
  }

  if (!section && canCreateUsers(role)) {
    return null;
  }

  return buildErrorResponse(forbiddenMessage, 403);
}

export async function ensureSrxServerActionAccess(
  section: SrxManagementSection,
  forbiddenMessage: string,
): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Chua dang nhap");
  }

  if (!canManageSrxSection(currentUser.role, section)) {
    throw new Error(forbiddenMessage);
  }
}
