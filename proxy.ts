import type { NextRequest } from "next/server";

import { appProxy } from "@/lib/app-proxy";

export function proxy(request: NextRequest) {
  return appProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
