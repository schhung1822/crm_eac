/*
 * DB SRX lưu cột DATETIME theo giờ Việt Nam (UTC+7, không có giờ mùa hè), nhưng Prisma luôn đọc/ghi
 * DATETIME như thể là giờ UTC. Nếu dùng thẳng, mốc thời gian đọc ra bị dư 7 giờ, ghi vào bị thiếu 7 giờ.
 * Chỉ dùng cho giá trị đi qua Prisma (prisma2); mysql2 đã tự xử lý theo múi giờ của process.
 */
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Giá trị DATETIME Prisma đọc từ DB SRX (giờ VN) → mốc thời gian thật. */
export function fromSrxDbDateTime(value: Date): Date {
  return new Date(value.getTime() - VIETNAM_UTC_OFFSET_MS);
}

/** Mốc thời gian thật → giá trị để Prisma ghi vào cột DATETIME giờ VN của DB SRX. */
export function toSrxDbDateTime(value: Date): Date {
  return new Date(value.getTime() + VIETNAM_UTC_OFFSET_MS);
}
