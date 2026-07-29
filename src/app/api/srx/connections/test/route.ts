import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { testSrxConnection } from "@/lib/srx-connections";
import { srxConnectionIds, type SrxConnectionId } from "@/lib/srx-connections.shared";

const payloadSchema = z.object({
  id: z.enum(srxConnectionIds as [SrxConnectionId, ...SrxConnectionId[]]),
});

export async function POST(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền kiểm tra kết nối");

    if (accessError) {
      return accessError;
    }

    const payload = payloadSchema.parse(await request.json());
    const connection = await testSrxConnection(payload.id);

    return NextResponse.json({ connection });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể kiểm tra kết nối");
  }
}
