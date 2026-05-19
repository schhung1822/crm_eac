import { after, NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { dispatchSrxOrderWebNotifications } from "@/lib/srx-orders-web";
import { parseSrxOrdersWebPayload } from "@/lib/srx-orders-web-payload";

export const runtime = "nodejs";

const apiToken = process.env.SRX_ORDERS_WEB_API_TOKEN?.trim() ?? "";

function isAuthorized(request: NextRequest): boolean {
  if (!apiToken) {
    return true;
  }

  return request.headers.get("authorization")?.trim() === `Bearer ${apiToken}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const payload = parseSrxOrdersWebPayload(await request.json());

    after(async () => {
      await dispatchSrxOrderWebNotifications(payload);
    });

    return NextResponse.json({ message: "Đã tiếp nhận thông báo đơn hàng." }, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          issues: error.flatten(),
          message: "Dữ liệu thông báo đơn hàng không hợp lệ.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Không thể tiếp nhận thông báo đơn hàng." }, { status: 500 });
  }
}
