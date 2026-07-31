/**
 * Client gọi Open API của Zalo, dùng cho luồng đăng nhập website bằng mã QR trên Mini App.
 *
 * Mini App chỉ gửi lên accessToken (và phoneToken tùy chọn); mọi thông tin định danh đều
 * do server hỏi lại Zalo, không tin dữ liệu client gửi lên.
 */

const ZALO_GRAPH_DEFAULT_BASE_URL = "https://graph.zalo.me/v2.0";
const ZALO_GRAPH_TIMEOUT_MS = 10_000;

/**
 * Mặc định gọi thẳng Open API của Zalo. Biến ZALO_GRAPH_BASE_URL chỉ dùng để trỏ sang
 * server giả khi chạy kiểm thử tự động — không đặt biến này ở production.
 */
function getZaloGraphBaseUrl(): string {
  const configured = String(process.env.ZALO_GRAPH_BASE_URL ?? "").trim();

  return (configured || ZALO_GRAPH_DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export type ZaloProfile = {
  zaloId: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
};

export function getZaloMiniAppConfig() {
  const appId = String(process.env.ZALO_MINIAPP_ID ?? "").trim();
  const appSecret = String(process.env.ZALO_APP_SECRET ?? "").trim();

  return { appId, appSecret };
}

/**
 * Đưa số điện thoại về dạng nội địa 0xxxxxxxxx, khớp với normalizePhone của SRX_web
 * để hai bên ghép tài khoản theo số điện thoại ra cùng kết quả.
 */
export function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("84") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith("0")) {
    return digits;
  }

  return digits.length === 9 ? `0${digits}` : digits;
}

async function callZaloGraph(
  endpoint: string,
  { searchParams = {}, headers = {} }: { searchParams?: Record<string, string>; headers?: Record<string, string> },
): Promise<Record<string, unknown>> {
  const url = new URL(endpoint);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(ZALO_GRAPH_TIMEOUT_MS),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  // Zalo trả HTTP 200 kèm error != 0 khi token sai, nên phải kiểm tra cả hai.
  if (!response.ok || (payload.error !== undefined && Number(payload.error) !== 0)) {
    throw new Error(String(payload.message ?? `Zalo API lỗi (${payload.error ?? response.status}).`));
  }

  return payload;
}

/**
 * Mini App gọi `getAccessToken()` rồi gửi token lên đây; server hỏi lại Zalo để chắc chắn
 * token là thật và lấy đúng zalo id theo app.
 */
export async function fetchZaloProfile(accessToken: string): Promise<Omit<ZaloProfile, "phone">> {
  const payload = await callZaloGraph(`${getZaloGraphBaseUrl()}/me`, {
    searchParams: { fields: "id,name,picture" },
    headers: { access_token: accessToken },
  });

  const zaloId = String(payload.id ?? "").trim();

  if (!zaloId) {
    throw new Error("Zalo không trả về id người dùng.");
  }

  const picture = payload.picture as { data?: { url?: string } } | undefined;

  return {
    zaloId,
    fullName: String(payload.name ?? "").trim(),
    avatarUrl: String(picture?.data?.url ?? "").trim() || null,
  };
}

/**
 * `getPhoneNumber()` ở Mini App chỉ trả về mã tạm; số thật phải đổi ở server bằng app secret.
 * Không lấy được số vẫn cho đăng nhập, chỉ là không ghép được với tài khoản web cũ theo SĐT.
 */
export async function fetchZaloPhoneNumber(accessToken: string, phoneToken: string): Promise<string | null> {
  const { appSecret } = getZaloMiniAppConfig();

  if (!accessToken || !phoneToken || !appSecret) {
    return null;
  }

  try {
    const payload = await callZaloGraph(`${getZaloGraphBaseUrl()}/me/info`, {
      headers: { access_token: accessToken, code: phoneToken, secret_key: appSecret },
    });

    const data = payload.data as { number?: string } | undefined;

    return normalizePhone(data?.number) || null;
  } catch (error) {
    console.error("Zalo phone lookup error:", error);
    return null;
  }
}

export async function resolveZaloProfile(accessToken: string, phoneToken: string): Promise<ZaloProfile> {
  const profile = await fetchZaloProfile(accessToken);
  const phone = await fetchZaloPhoneNumber(accessToken, phoneToken);

  return { ...profile, phone };
}
