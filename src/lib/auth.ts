import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { createToken, verifyToken, type JWTPayload } from "@/lib/auth-token";

const COOKIE_NAME = "auth-token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface RequestLike {
  headers: {
    get(name: string): string | null;
  };
  url: string;
}

function isSecureRequest(request?: RequestLike): boolean {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  if (!request) {
    return process.env.NODE_ENV === "production";
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function getAuthCookieOptions(request?: RequestLike) {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function setAuthCookie(response: NextResponse, token: string, request?: RequestLike): void {
  response.cookies.set(COOKIE_NAME, token, getAuthCookieOptions(request));
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export function removeAuthCookie(response: NextResponse, request?: RequestLike): void {
  response.cookies.set(COOKIE_NAME, "", {
    ...getAuthCookieOptions(request),
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  return verifyToken(token);
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

export { createToken, verifyToken, type JWTPayload };
