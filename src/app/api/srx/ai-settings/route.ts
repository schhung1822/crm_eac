import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { srxAiProviderLabels, srxAiTextProviderIds } from "@/lib/srx-ai-models.shared";
import { getSrxConnectionSecret } from "@/lib/srx-connections";

/**
 * Cho trình soạn tin tức biết nhà cung cấp AI nào đã có API key để hiện trong
 * dropdown. Bản thân API key không bao giờ rời khỏi server (cấu hình ở trang /ai).
 */
export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem cấu hình AI");

    if (accessError) {
      return accessError;
    }

    const providers = await Promise.all(
      srxAiTextProviderIds.map(async (id) => ({
        id,
        label: srxAiProviderLabels[id],
        hasApiKey: Boolean((await getSrxConnectionSecret(id)).trim()),
      })),
    );

    return NextResponse.json({ providers });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải cấu hình AI");
  }
}
