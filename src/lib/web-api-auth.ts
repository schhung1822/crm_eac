import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Kiểm tra token Bearer cho các API công khai mà website SRX gọi vào CRM.
 * Ở production, nếu chưa cấu hình token thì từ chối mọi yêu cầu thay vì để mở cho cả internet.
 * Ở môi trường dev, cho phép bỏ trống token để chạy thử cục bộ.
 */
export function isWebApiRequestAuthorized(request: NextRequest, tokenEnvName: string): boolean {
  // eslint-disable-next-line security/detect-object-injection -- tên biến môi trường do mã nguồn cố định, không từ người dùng.
  const token = process.env[tokenEnvName]?.trim() ?? "";

  if (!token) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[SRX] ${tokenEnvName} chưa được cấu hình nên API công khai từ chối mọi yêu cầu.`);
      return false;
    }

    return true;
  }

  const header = request.headers.get("authorization")?.trim() ?? "";

  return safeEqual(header, `Bearer ${token}`);
}
