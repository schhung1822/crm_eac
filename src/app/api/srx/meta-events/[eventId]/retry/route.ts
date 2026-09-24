import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { retryMetaDatasetEvent } from "@/lib/meta-conversions";

export const runtime = "nodejs";

const paramsSchema = z.object({
  eventId: z.string().regex(/^\d+$/),
});

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền gửi lại sự kiện Meta");

    if (accessError) {
      return accessError;
    }

    const eventId = paramsSchema.parse(await context.params).eventId;
    const delivered = await retryMetaDatasetEvent(eventId);

    return NextResponse.json({
      delivered,
      message: delivered ? "Đã gửi sự kiện lên Meta" : "Sự kiện đang chờ cấu hình Meta hoặc đang được xử lý",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể gửi lại sự kiện Meta");
  }
}
