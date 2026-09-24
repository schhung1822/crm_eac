import { after, NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { sendCompleteRegistrationForLadipage } from "@/lib/meta-conversions";

export const runtime = "nodejs";

const apiToken = process.env.SRX_META_EVENTS_WEB_API_TOKEN?.trim() ?? "";

const payloadSchema = z
  .object({
    registrationId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform(String),
  })
  .strict();

function isAuthorized(request: NextRequest): boolean {
  if (!apiToken) {
    return true;
  }

  return request.headers.get("authorization")?.trim() === `Bearer ${apiToken}`;
}

async function dispatchRegistrationEvent(registrationId: string): Promise<void> {
  try {
    await sendCompleteRegistrationForLadipage(registrationId);
  } catch (error) {
    console.error("Ladipage Meta CompleteRegistration error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { registrationId } = payloadSchema.parse(await request.json());

    after(() => dispatchRegistrationEvent(registrationId));

    return NextResponse.json({ message: "Đã tiếp nhận sự kiện đăng ký Ladipage." }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          issues: error.flatten(),
          message: "Dữ liệu sự kiện đăng ký Ladipage không hợp lệ.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Không thể tiếp nhận sự kiện đăng ký Ladipage." }, { status: 500 });
  }
}
