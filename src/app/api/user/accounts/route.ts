import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import type { ManagedUserAccount } from "@/lib/account-management.shared";
import { prisma } from "@/lib/prisma";
import { canCreateUsers, normalizeRole } from "@/lib/rbac";

type ListedUserAccount = {
  id: number;
  user: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  last_login: Date | null;
  create_time: Date | null;
};

function serializeManagedUserAccount(account: ListedUserAccount, currentUserId: number): ManagedUserAccount {
  return {
    id: account.id,
    username: account.user ?? "",
    email: account.email ?? "",
    name: account.name ?? null,
    phone: account.phone ?? null,
    role: normalizeRole(account.role),
    status: account.status ?? null,
    lastLogin: account.last_login?.toISOString() ?? null,
    createdAt: account.create_time?.toISOString() ?? null,
    isCurrentUser: account.id === currentUserId,
  };
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
    }

    if (!canCreateUsers(currentUser.role)) {
      return NextResponse.json({ message: "Ban khong co quyen xem danh sach tai khoan" }, { status: 403 });
    }

    const accounts = await prisma.user.findMany({
      select: {
        id: true,
        user: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        last_login: true,
        create_time: true,
      },
      orderBy: [{ create_time: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(
      {
        accounts: accounts.map((account) => serializeManagedUserAccount(account, currentUser.userId)),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("List user accounts error:", error);
    return NextResponse.json({ message: "Khong the tai danh sach tai khoan" }, { status: 500 });
  }
}
