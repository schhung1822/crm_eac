/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

import { createToken, setAuthCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ message: "Ten dang nhap va mat khau la bat buoc" }, { status: 400 });
    }

    const userRecord = await prisma.user.findFirst({
      where: {
        OR: [{ user: username }, { email: username }],
      },
    });

    if (!userRecord || !userRecord.password) {
      return NextResponse.json({ message: "Ten dang nhap hoac mat khau khong dung" }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, userRecord.password);

    if (!isValidPassword) {
      return NextResponse.json({ message: "Ten dang nhap hoac mat khau khong dung" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userRecord.id },
      data: { last_login: new Date() },
    });

    const token = await createToken({
      userId: userRecord.id,
      username: userRecord.user ?? "",
      email: userRecord.email ?? "",
      role: userRecord.role ?? "user",
      name: userRecord.name ?? undefined,
      phone: userRecord.phone ?? undefined,
      avatar: undefined,
    });

    const response = NextResponse.json(
      {
        message: "Dang nhap thanh cong",
        user: {
          userId: userRecord.id,
          username: userRecord.user,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          phone: userRecord.phone,
        },
      },
      { status: 200 },
    );

    setAuthCookie(response, token, request);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Co loi xay ra. Vui long thu lai!" }, { status: 500 });
  }
}
