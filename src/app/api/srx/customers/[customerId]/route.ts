import { NextRequest, NextResponse } from "next/server";

import { ZodError, z } from "zod";

import { ensureAdminApiAccess } from "@/lib/admin-api";
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

function buildRouteErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Du lieu cap nhat khong hop le",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  if (isDuplicateEntryError(error)) {
    return NextResponse.json(
      {
        message: "Email hoac so dien thoai da ton tai trong website SRX",
      },
      { status: 409 },
    );
  }

  console.error("Update SRX customer error:", error);

  return NextResponse.json(
    {
      message: "Co loi xay ra khi cap nhat khach hang website",
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessError = await ensureAdminApiAccess(request, "Ban khong co quyen cap nhat khach hang website");

    if (accessError) {
      return accessError;
    }

    const customerId = await resolveCustomerId(context);
    const payload = parseUpdateSrxCustomerInput(await request.json());
    const customer = await updateSrxCustomer(customerId, payload);

    if (!customer) {
      return NextResponse.json({ message: "Khong tim thay khach hang website" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Cap nhat khach hang website thanh cong",
        customer,
      },
      { status: 200 },
    );
  } catch (error) {
    return buildRouteErrorResponse(error);
  }
}
