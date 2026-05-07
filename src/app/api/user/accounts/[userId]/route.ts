import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import type { ManagedUserAccount } from "@/lib/account-management.shared";
import { prisma } from "@/lib/prisma";
import { canCreateUsers, isAppRole, normalizeRole } from "@/lib/rbac";

const paramsSchema = z.object({
  userId: z.string().regex(/^\d+$/),
});

const updateBodySchema = z.object({
  role: z.string().min(1),
});

type RouteContext = {
  params: Promise<{ userId: string }>;
};

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

async function resolveUserId(context: RouteContext): Promise<number> {
  const params = await context.params;
  return Number(paramsSchema.parse(params).userId);
}

async function countAdminUsers(): Promise<number> {
  const users = await prisma.user.findMany({
    select: {
      role: true,
    },
  });

  return users.reduce((count, user) => count + (normalizeRole(user.role) === "admin" ? 1 : 0), 0);
}

async function ensureAdminRequestAccess() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      currentUser: null,
      response: NextResponse.json({ message: "Chua dang nhap" }, { status: 401 }),
    };
  }

  if (!canCreateUsers(currentUser.role)) {
    return {
      currentUser: null,
      response: NextResponse.json({ message: "Ban khong co quyen quan ly tai khoan" }, { status: 403 }),
    };
  }

  return {
    currentUser,
    response: null,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { currentUser, response } = await ensureAdminRequestAccess();

    if (response || !currentUser) {
      return response;
    }

    const userId = await resolveUserId(context);
    const body = updateBodySchema.parse(await request.json());

    if (!isAppRole(body.role)) {
      return NextResponse.json({ message: "Vai tro khong hop le" }, { status: 400 });
    }

    const targetAccount = await prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!targetAccount) {
      return NextResponse.json({ message: "Khong tim thay tai khoan" }, { status: 404 });
    }

    if (targetAccount.id === currentUser.userId) {
      return NextResponse.json({ message: "Khong the tu thay doi quyen cua chinh minh" }, { status: 400 });
    }

    const targetRole = normalizeRole(targetAccount.role);

    if (targetRole === "admin" && body.role !== "admin") {
      const adminCount = await countAdminUsers();

      if (adminCount <= 1) {
        return NextResponse.json({ message: "He thong phai giu lai it nhat 1 admin" }, { status: 400 });
      }
    }

    const updatedAccount = await prisma.user.update({
      where: { id: userId },
      data: {
        role: body.role,
        updated_by: currentUser.username,
      },
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
    });

    return NextResponse.json(
      {
        message: "Da cap nhat quyen tai khoan",
        account: serializeManagedUserAccount(updatedAccount, currentUser.userId),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update user account role error:", error);
    return NextResponse.json({ message: "Khong the cap nhat quyen tai khoan" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { currentUser, response } = await ensureAdminRequestAccess();

    if (response || !currentUser) {
      return response;
    }

    const userId = await resolveUserId(context);
    const targetAccount = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetAccount) {
      return NextResponse.json({ message: "Khong tim thay tai khoan" }, { status: 404 });
    }

    if (targetAccount.id === currentUser.userId) {
      return NextResponse.json({ message: "Khong the tu xoa tai khoan dang dang nhap" }, { status: 400 });
    }

    if (normalizeRole(targetAccount.role) === "admin") {
      const adminCount = await countAdminUsers();

      if (adminCount <= 1) {
        return NextResponse.json({ message: "He thong phai giu lai it nhat 1 admin" }, { status: 400 });
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "Da xoa tai khoan" }, { status: 200 });
  } catch (error) {
    console.error("Delete user account error:", error);
    return NextResponse.json({ message: "Khong the xoa tai khoan" }, { status: 500 });
  }
}
