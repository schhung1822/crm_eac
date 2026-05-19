import { after, NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { dispatchSrxAffiliateApplicationsWebNotifications } from "@/lib/srx-affiliate-applications-web";
import { parseSrxAffiliateApplicationsWebPayload } from "@/lib/srx-affiliate-applications-web-payload";

export const runtime = "nodejs";

const apiToken = process.env.SRX_AFFILIATE_APPLICATIONS_WEB_API_TOKEN?.trim() ?? "";

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

    const payload = parseSrxAffiliateApplicationsWebPayload(await request.json());

    after(async () => {
      await dispatchSrxAffiliateApplicationsWebNotifications(payload);
    });

    return NextResponse.json({ message: "Đã tiếp nhận thông báo hồ sơ affiliate." }, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          issues: error.flatten(),
          message: "Dữ liệu thông báo hồ sơ affiliate không hợp lệ.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Không thể tiếp nhận thông báo hồ sơ affiliate." }, { status: 500 });
  }
}
