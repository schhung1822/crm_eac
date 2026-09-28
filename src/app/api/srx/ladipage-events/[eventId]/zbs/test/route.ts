import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { sendSrxLadipageZbsTest } from "@/lib/srx-ladipage-zbs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền gửi thử ZBS");

    if (accessError) {
      return accessError;
    }

    const { eventId } = await params;

    if (!/^\d+$/.test(eventId)) {
      return NextResponse.json({ message: "ID sự kiện không hợp lệ" }, { status: 400 });
    }

    const result = await sendSrxLadipageZbsTest(eventId, await request.json());

    if (!result.ok) {
      return NextResponse.json(
        { message: result.errorMessage ?? "Zalo từ chối gửi tin", code: result.code },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: `Đã gửi tin thử (mã ${result.code})`, code: result.code });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể gửi thử ZBS");
  }
}
