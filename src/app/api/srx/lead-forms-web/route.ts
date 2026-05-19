import { after, NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { dispatchSrxLeadFormsWebNotifications } from "@/lib/srx-lead-forms-web";
import { parseSrxLeadFormsWebPayload } from "@/lib/srx-lead-forms-web-payload";

export const runtime = "nodejs";

const apiToken = process.env.SRX_LEAD_FORMS_WEB_API_TOKEN?.trim() ?? "";

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

    const payload = parseSrxLeadFormsWebPayload(await request.json());

    after(async () => {
      await dispatchSrxLeadFormsWebNotifications(payload);
    });

    return NextResponse.json({ message: "Đã tiếp nhận thông báo form website." }, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          issues: error.flatten(),
          message: "Dữ liệu form website không hợp lệ.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Không thể tiếp nhận form website." }, { status: 500 });
  }
}
