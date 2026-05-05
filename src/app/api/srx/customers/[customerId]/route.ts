import { NextRequest, NextResponse } from "next/server";

import { ZodError, z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { parseUpdateSrxCustomerInput, updateSrxCustomer } from "@/lib/srx-users";

const routeParamsSchema = z.object({
  customerId: z.string().regex(/^\d+$/),
});

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

function isDuplicateEntryError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

async function resolveCustomerId(context: RouteContext): Promise<string> {
  const paramsResolved = await context.params;
  return routeParamsSchema.parse(paramsResolved).customerId;
}

async function ensureAdminAccess(): Promise<NextResponse | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json({ message: "Bạn không có quyền cập nhật khách hàng website" }, { status: 403 });
  }

  return null;
}

function buildRouteErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Dữ liệu cập nhật không hợp lệ",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  if (isDuplicateEntryError(error)) {
    return NextResponse.json(
      {
        message: "Email hoặc số điện thoại đã tồn tại trong website SRX",
      },
      { status: 409 },
    );
  }

  console.error("Update SRX customer error:", error);

  return NextResponse.json(
    {
      message: "Có lỗi xảy ra khi cập nhật khách hàng website",
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminAccess();

    if (accessError) {
      return accessError;
    }

    const customerId = await resolveCustomerId(context);
    const payload = parseUpdateSrxCustomerInput(await request.json());
    const customer = await updateSrxCustomer(customerId, payload);

    if (!customer) {
      return NextResponse.json({ message: "Không tìm thấy khách hàng website" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Cập nhật khách hàng website thành công",
        customer,
      },
      { status: 200 },
    );
  } catch (error) {
    return buildRouteErrorResponse(error);
  }
}
