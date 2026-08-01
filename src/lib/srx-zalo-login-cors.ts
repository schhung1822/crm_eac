import { NextRequest, NextResponse } from "next/server";

/**
 * Zalo Mini App chạy trong webview trên domain của Zalo (h5.zdn.vn/zalo.me) nên các
 * endpoint dành cho Mini App phải mở CORS.
 *
 * Hai endpoint này không đọc cookie, chỉ xác thực bằng ticket + access token Zalo được
 * kiểm chứng lại với graph.zalo.me, nên cho phép origin `*` là an toàn.
 */
export function getMiniAppAllowedOrigin(request: NextRequest): string {
  const configured = String(process.env.ZALO_MINIAPP_ALLOWED_ORIGINS ?? "").trim();

  if (!configured || configured === "*") {
    return "*";
  }

  const requestOrigin = request.headers.get("origin");
  const allowList = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return requestOrigin && allowList.includes(requestOrigin) ? requestOrigin : allowList[0];
}

const DEFAULT_ALLOWED_METHODS = "POST, OPTIONS";

export function withMiniAppCors<T extends NextResponse | Response>(
  response: T,
  request: NextRequest,
  allowedMethods: string = DEFAULT_ALLOWED_METHODS,
): T {
  response.headers.set("Access-Control-Allow-Origin", getMiniAppAllowedOrigin(request));
  response.headers.set("Access-Control-Allow-Methods", allowedMethods);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  return response;
}

export function handleMiniAppPreflight(
  request: NextRequest,
  allowedMethods: string = DEFAULT_ALLOWED_METHODS,
): Response {
  return withMiniAppCors(new Response(null, { status: 204 }), request, allowedMethods);
}
