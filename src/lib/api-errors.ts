import { NextResponse } from "next/server";

import { ZodError } from "zod";

export function buildApiErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Dữ liệu không hợp lệ",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        message: error.message || fallbackMessage,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      message: fallbackMessage,
    },
    { status: 500 },
  );
}
