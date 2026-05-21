import { NextResponse, type NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth-token";
import { canAccessPath, getDefaultRouteForRole, normalizeRole } from "@/lib/rbac";

const PUBLIC_ROUTES = [
  "/auth/v2/login",
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/srx/lead-forms-web",
  "/api/srx/orders_web",
  "/api/srx/affiliate-applications-web",
];
const AUTH_ROUTES = ["/auth/v2/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (token && isAuthRoute) {
    const payload = await verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(payload.role), request.url));
    }
  }

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const role = normalizeRole(payload.role);

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
