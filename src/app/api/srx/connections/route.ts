import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { getSrxAiUsageReport } from "@/lib/srx-ai-usage";
import { deleteSrxConnection, getSrxConnectionStates, saveSrxConnection } from "@/lib/srx-connections";
import { srxConnectionCatalog, srxConnectionIds, type SrxConnectionId } from "@/lib/srx-connections.shared";

const connectionIdSchema = z.enum(srxConnectionIds as [SrxConnectionId, ...SrxConnectionId[]]);

const savePayloadSchema = z.object({
  id: connectionIdSchema,
  // Bỏ trống = giữ nguyên secret cũ; chuỗi rỗng có chủ đích thì dùng clearSecret.
  secret: z.string().optional(),
  clearSecret: z.boolean().optional(),
  values: z.record(z.string(), z.string()).optional().default({}),
});

const deletePayloadSchema = z.object({ id: connectionIdSchema });

export async function GET(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xem kết nối");

    if (accessError) {
      return accessError;
    }

    const [connections, usage] = await Promise.all([getSrxConnectionStates(), getSrxAiUsageReport()]);

    return NextResponse.json({ catalog: srxConnectionCatalog, connections, usage });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể tải danh sách kết nối");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền lưu kết nối");

    if (accessError) {
      return accessError;
    }

    const payload = savePayloadSchema.parse(await request.json());

    // clearSecret => xoá; có secret mới => ghi đè; còn lại => giữ nguyên secret cũ.
    let secret: string | undefined;

    if (payload.clearSecret) {
      secret = "";
    } else if (payload.secret?.trim()) {
      secret = payload.secret;
    }

    const connection = await saveSrxConnection({
      id: payload.id,
      secret,
      values: payload.values,
    });

    return NextResponse.json({ message: "Đã lưu kết nối", connection });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể lưu kết nối");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền xóa kết nối");

    if (accessError) {
      return accessError;
    }

    const payload = deletePayloadSchema.parse(await request.json());
    await deleteSrxConnection(payload.id);

    return NextResponse.json({ message: "Đã xóa kết nối" });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa kết nối");
  }
}
