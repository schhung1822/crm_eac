import { after, NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { sendSrxLuckyWheelSpinZbs } from "@/lib/srx-lucky-wheel-zbs";

export const runtime = "nodejs";

const apiToken = process.env.SRX_LUCKY_WHEEL_WEB_API_TOKEN?.trim() ?? "";

const payloadSchema = z
  .object({
    spinId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform(String),
  })
  .strict();

function isAuthorized(request: NextRequest): boolean {
  if (!apiToken) {
    return true;
  }

  return request.headers.get("authorization")?.trim() === `Bearer ${apiToken}`;
}

/**
 * SRX_web gọi sau mỗi lượt trúng voucher của vòng quay may mắn: CRM gửi tin ZBS kèm mã.
 * Chỉ nhận id lượt quay; mã, số điện thoại và cấu hình mẫu đều đọc lại từ database.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { spinId } = payloadSchema.parse(await request.json());

    after(async () => {
      try {
        await sendSrxLuckyWheelSpinZbs(spinId);
      } catch (error) {
        console.error("Lucky wheel ZBS error:", error);
      }
    });

    return NextResponse.json({ message: "Đã tiếp nhận lượt trúng vòng quay." }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { issues: error.flatten(), message: "Dữ liệu lượt quay không hợp lệ." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Không thể tiếp nhận lượt trúng vòng quay." }, { status: 500 });
  }
}
