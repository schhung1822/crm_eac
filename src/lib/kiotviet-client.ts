import "server-only";

import { prisma } from "@/lib/prisma";

const KIOTVIET_API_BASE_URL = "https://public.kiotapi.com";
const KIOTVIET_TOKEN_NAME = "kiotviet";
const REQUEST_TIMEOUT_MS = 20_000;

export class KiotVietApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "KiotVietApiError";
  }
}

type KiotVietCredentials = { accessToken: string; retailer: string };

/**
 * access_token của dòng token_name = "kiotviet" (được làm mới bên ngoài CRM).
 * Mã shop cho header Retailer lấy từ claim client_RetailerCode của chính token,
 * vì cột `user` của dòng này không phải mã shop.
 */
async function readKiotVietCredentials(): Promise<KiotVietCredentials> {
  const token = await prisma.token.findFirst({
    orderBy: { id: "desc" },
    select: { access_token: true, user: true },
    where: { token_name: KIOTVIET_TOKEN_NAME, access_token: { not: null } },
  });
  const accessToken = token?.access_token?.trim() ?? "";

  if (!accessToken) {
    throw new Error(`Chưa có access_token "${KIOTVIET_TOKEN_NAME}" trong bảng token`);
  }

  const retailer = readRetailerCode(accessToken) || (token?.user?.trim() ?? "");

  if (!retailer) {
    throw new Error("Không xác định được mã shop KiotViet (Retailer)");
  }

  return { accessToken, retailer };
}

/** Claim client_RetailerCode trong phần payload của JWT; rỗng nếu token không đọc được. */
function readRetailerCode(accessToken: string): string {
  try {
    const claims = JSON.parse(Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString("utf8")) as {
      client_RetailerCode?: unknown;
    };
    return typeof claims.client_RetailerCode === "string" ? claims.client_RetailerCode : "";
  } catch {
    return "";
  }
}

function readErrorMessage(body: unknown, status: number): { message: string; errorCode: string } {
  const responseStatus =
    body && typeof body === "object" && "responseStatus" in body
      ? (body.responseStatus as { errorCode?: string; message?: string } | undefined)
      : undefined;

  return {
    message: responseStatus?.message ?? `KiotViet trả về HTTP ${status}`,
    errorCode: responseStatus?.errorCode ?? "",
  };
}

async function kiotVietRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { accessToken, retailer } = await readKiotVietCredentials();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${KIOTVIET_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Retailer: retailer,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const result = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const { message, errorCode } = readErrorMessage(result, response.status);
      throw new KiotVietApiError(message, response.status, errorCode, result);
    }

    return result as T;
  } finally {
    clearTimeout(timer);
  }
}

/** KiotViet báo "không tồn tại" bằng HTTP 420/404 thay vì trả rỗng. */
function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof KiotVietApiError &&
    (error.status === 404 || (error.status === 420 && /Validate|NotFound/i.test(error.errorCode)))
  );
}

export type KiotVietProduct = { id: number; code: string; name: string; basePrice: number };
export type KiotVietCustomer = { id: number; code: string; name: string; contactNumber?: string };

export async function getKiotVietProductByCode(code: string): Promise<KiotVietProduct | null> {
  try {
    return await kiotVietRequest<KiotVietProduct>("GET", `/products/code/${encodeURIComponent(code)}`);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getKiotVietCustomerByCode(code: string): Promise<KiotVietCustomer | null> {
  try {
    return await kiotVietRequest<KiotVietCustomer>("GET", `/customers/code/${encodeURIComponent(code)}`);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function findKiotVietCustomerByPhone(phone: string): Promise<KiotVietCustomer | null> {
  const result = await kiotVietRequest<{ data?: KiotVietCustomer[] }>(
    "GET",
    `/customers?pageSize=5&contactNumber=${encodeURIComponent(phone)}`,
  );

  return result.data?.at(0) ?? null;
}

export async function createKiotVietCustomer(input: {
  address: string;
  branchId: number;
  comments: string;
  contactNumber: string;
  email?: string;
  name: string;
}): Promise<KiotVietCustomer> {
  const result = await kiotVietRequest<KiotVietCustomer | { data?: KiotVietCustomer }>("POST", "/customers", input);
  const customer = "data" in result && result.data ? result.data : (result as KiotVietCustomer);

  if (!customer.id) {
    throw new Error("KiotViet không trả về ID khách hàng vừa tạo");
  }

  return customer;
}

export type KiotVietCreatedOrder = { id: number; code: string };

export async function createKiotVietOrder(payload: unknown): Promise<{ order: KiotVietCreatedOrder; raw: unknown }> {
  const result = await kiotVietRequest<KiotVietCreatedOrder | { data?: KiotVietCreatedOrder }>(
    "POST",
    "/orders",
    payload,
  );
  const order = "data" in result && result.data ? result.data : (result as KiotVietCreatedOrder);

  if (!order.id) {
    throw new Error("KiotViet không trả về ID đơn hàng vừa tạo");
  }

  return { order: { id: order.id, code: order.code }, raw: result };
}
