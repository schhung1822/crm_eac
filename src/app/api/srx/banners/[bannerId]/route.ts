import { NextRequest, NextResponse } from "next/server";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import { deleteSrxBanner, parseSrxBannerInput, updateSrxBanner } from "@/lib/srx-website";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bannerId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý banner SRX");

    if (accessError) {
      return accessError;
    }

    const { bannerId } = await params;
    const payload = parseSrxBannerInput(await request.json());
    const banner = await updateSrxBanner(bannerId, payload);

    if (!banner) {
      return NextResponse.json({ message: "Không tìm thấy banner" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật banner",
      banner,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật banner");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bannerId: string }> },
) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý banner SRX");

    if (accessError) {
      return accessError;
    }

    const { bannerId } = await params;
    await deleteSrxBanner(bannerId);

    return NextResponse.json({
      message: "Đã xóa banner",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa banner");
  }
}

