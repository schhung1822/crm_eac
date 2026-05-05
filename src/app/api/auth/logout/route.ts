import { NextRequest, NextResponse } from "next/server";

import { removeAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: "Dang xuat thanh cong" }, { status: 200 });

    removeAuthCookie(response, request);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: "Co loi xay ra" }, { status: 500 });
  }
}
