import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  avatar?: string;
}

// Các giá trị mẫu (trong mã nguồn cũ, .env.example, hoặc bản sao chép từ hướng dẫn) ai cũng đoán được,
// nên bị chặn ở production dù đủ độ dài.
const PLACEHOLDER_MARKERS = ["change-this", "change-me", "changeme", "replace-with", "your-secret", "secret-key"];

function isPlaceholderSecret(value: string): boolean {
  const normalized = value.toLowerCase();

  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

const DEV_ONLY_SECRET = "dev-only-insecure-jwt-secret-do-not-use-in-production";
const MIN_PRODUCTION_SECRET_LENGTH = 32;

let cachedSecret: Uint8Array | undefined;

// Đọc khoá khi cần dùng (không phải lúc nạp module) để quá trình build không bị lỗi khi chưa có biến môi trường.
function getJwtSecret(): Uint8Array {
  if (cachedSecret) {
    return cachedSecret;
  }

  const configured = process.env.JWT_SECRET?.trim() ?? "";

  if (process.env.NODE_ENV !== "production") {
    cachedSecret = new TextEncoder().encode(configured || DEV_ONLY_SECRET);
    return cachedSecret;
  }

  if (!configured || isPlaceholderSecret(configured) || configured.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET chưa được cấu hình an toàn: cần một chuỗi ngẫu nhiên dài tối thiểu ${MIN_PRODUCTION_SECRET_LENGTH} ký tự và không dùng giá trị mẫu.`,
    );
  }

  cachedSecret = new TextEncoder().encode(configured);
  return cachedSecret;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  let secret: Uint8Array;

  try {
    secret = getJwtSecret();
  } catch (error) {
    // Lỗi cấu hình phải hiện rõ trong log, không được nuốt thành "token sai".
    console.error("JWT configuration error:", error);
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
