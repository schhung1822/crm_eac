import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
import { buildApiErrorResponse } from "@/lib/api-errors";
import {
  deleteSrxLadipageEvent,
  srxLadipageEventStatusValues,
  updateSrxLadipageEventSettings,
} from "@/lib/srx-ladipage-events";

const paramsSchema = z.object({
  eventId: z.string().regex(/^\d+$/),
});

const settingsSchema = z.object({
  status: z.enum(srxLadipageEventStatusValues).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

async function resolveEventId(context: { params: Promise<{ eventId: string }> }): Promise<string> {
  const params = await context.params;
  return paramsSchema.parse(params).eventId;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý Ladipage sự kiện website");

    if (accessError) {
      return accessError;
    }

    const eventId = await resolveEventId(context);
    const payload = settingsSchema.parse(await request.json());
    const event = await updateSrxLadipageEventSettings(eventId, payload);

    if (!event) {
      return NextResponse.json({ message: "Không tìm thấy Ladipage sự kiện" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã cập nhật Ladipage sự kiện",
      event,
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể cập nhật Ladipage sự kiện");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Bạn không có quyền quản lý Ladipage sự kiện website");

    if (accessError) {
      return accessError;
    }

    const eventId = await resolveEventId(context);
    const deleted = await deleteSrxLadipageEvent(eventId);

    if (!deleted) {
      return NextResponse.json({ message: "Không tìm thấy Ladipage sự kiện" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Đã xóa Ladipage sự kiện",
    });
  } catch (error) {
    return buildApiErrorResponse(error, "Không thể xóa Ladipage sự kiện");
  }
}
