import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateUsers, isAppRole, normalizeRole } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
    }

    if (!canCreateUsers(currentUser.role)) {
      return NextResponse.json({ message: "Ban khong co quyen tao tai khoan" }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, name, role, phone } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ message: "Vui long nhap day du username, email va mat khau" }, { status: 400 });
    }

    if (role && !isAppRole(role)) {
      return NextResponse.json({ message: "Vai tro khong hop le" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ user: username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Username hoac email da ton tai" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        user: username,
        email,
        password: hashedPassword,
        name: name || username,
        role: normalizeRole(role),
        phone: phone || null,
        status: "active",
        created_by: currentUser.username,
        updated_by: currentUser.username,
      },
    });

    return NextResponse.json(
      {
        message: "Tao tai khoan thanh cong",
        user: {
          id: newUser.id,
          username: newUser.user,
          email: newUser.email,
          name: newUser.name,
          role: normalizeRole(newUser.role),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { message: "Co loi xay ra khi tao tai khoan", error: error.message },
      { status: 500 },
    );
  }
}
