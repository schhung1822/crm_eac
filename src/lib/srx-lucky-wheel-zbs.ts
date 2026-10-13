import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

import { getSrxDB } from "@/lib/srx-db";
import { normalizeZbsPhone } from "@/lib/srx-ladipage-zbs.shared";
import { getSrxLuckyWheelSettings, mapSpin, SPIN_SELECT } from "@/lib/srx-lucky-wheel";
import { ensureLuckyWheelTables } from "@/lib/srx-lucky-wheel-tables";
import {
  buildCustomerCode,
  buildSrxLuckyWheelZbsTemplateData,
  type SrxLuckyWheelSpin,
} from "@/lib/srx-lucky-wheel.shared";
import { sendZaloZbsTemplateMessage } from "@/lib/srx-zalo-zbs";

/**
 * Gửi mã voucher trúng vòng quay may mắn tới Zalo của khách bằng tin ZBS (mẫu "SRX | Tri ân
 * khách hàng"). SRX_web tạo mã và đặt lucky_wheel_spins.zbs_status = 'pending', rồi gọi
 * /api/srx/lucky-wheel-web để CRM gửi (access_token của OA chỉ có ở CRM).
 */

// Định dạng tham số kiểu date của Zalo; lấy nguyên giờ đã lưu trong SQL, không đổi múi giờ.
const SQL_ZALO_DATE_FORMAT = "%H:%i:%s %d/%m/%Y";

type VoucherSpinRow = RowDataPacket & {
  id: number;
  user_id: number;
  customer_name: string | null;
  phone: string | null;
  voucher_code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  start_date: string;
  expire: string;
};

type DeliveryResult = { ok: boolean; errorMessage?: string };

async function loadVoucherSpin(spinId: string): Promise<VoucherSpinRow | null> {
  const [rows] = await getSrxDB().query<VoucherSpinRow[]>(
    `SELECT s.id, s.user_id,
            COALESCE(NULLIF(u.display_name, ''), u.full_name, '') AS customer_name,
            u.phone,
            dc.code AS voucher_code, dc.discount_type, dc.discount_value, dc.max_discount_amount, dc.min_order_amount,
            DATE_FORMAT(dc.starts_at, '${SQL_ZALO_DATE_FORMAT}') AS start_date,
            DATE_FORMAT(dc.ends_at, '${SQL_ZALO_DATE_FORMAT}') AS expire
       FROM lucky_wheel_spins s
       JOIN discount_codes dc ON dc.id = s.discount_code_id
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
      LIMIT 1`,
    [spinId],
  );

  return rows.at(0) ?? null;
}

async function finishSpinZbs(
  spinId: string,
  result: { status: "sent" | "failed"; msgId?: string; errorMessage?: string },
): Promise<void> {
  await getSrxDB().query(
    `UPDATE lucky_wheel_spins
        SET zbs_status = ?, zbs_msg_id = ?, zbs_error = ?, zbs_sent_at = IF(? = 'sent', NOW(), zbs_sent_at)
      WHERE id = ?`,
    [result.status, result.msgId ?? null, result.errorMessage?.slice(0, 500) ?? null, result.status, spinId],
  );
}

/** Gửi tin cho một lượt quay đã được giữ chỗ (zbs_status = 'sending') và ghi kết quả. */
async function deliverSpinZbs(spinId: string): Promise<DeliveryResult> {
  const fail = async (errorMessage: string): Promise<DeliveryResult> => {
    await finishSpinZbs(spinId, { status: "failed", errorMessage });
    return { ok: false, errorMessage };
  };

  const settings = await getSrxLuckyWheelSettings();

  if (!settings.zbs_enabled) {
    return fail("Đang tắt gửi ZBS trong cấu hình vòng quay");
  }

  const spin = await loadVoucherSpin(spinId);

  if (!spin) {
    return fail("Không tìm thấy mã voucher của lượt quay");
  }

  const phone = normalizeZbsPhone(spin.phone ?? "");

  if (!phone) {
    return fail("Tài khoản chưa có số điện thoại di động hợp lệ");
  }

  const result = await sendZaloZbsTemplateMessage({
    phone,
    templateId: settings.zbs_template_id,
    tokenName: settings.zbs_token_name,
    trackingId: `lw${spinId}`,
    templateData: buildSrxLuckyWheelZbsTemplateData({
      customerName: spin.customer_name ?? "",
      customerCode: buildCustomerCode(spin.user_id),
      voucherCode: spin.voucher_code,
      discountType: spin.discount_type,
      discountValue: Number(spin.discount_value),
      maxDiscountAmount: spin.max_discount_amount === null ? null : Number(spin.max_discount_amount),
      minOrderAmount: spin.min_order_amount === null ? null : Number(spin.min_order_amount),
      startDate: spin.start_date,
      expire: spin.expire,
    }),
  });

  if (!result.ok) {
    return fail(result.errorMessage);
  }

  await finishSpinZbs(spinId, { status: "sent", msgId: result.msgId });
  return { ok: true };
}

/**
 * Giữ chỗ bằng UPDATE có điều kiện trạng thái: website gọi lại hay admin bấm gửi lại cùng lúc
 * thì cũng chỉ một bên gửi được tin.
 */
async function claimSpinZbs(spinId: string, fromStatuses: readonly string[]): Promise<boolean> {
  const placeholders = fromStatuses.map(() => "?").join(", ");
  const [result] = await getSrxDB().query<ResultSetHeader>(
    `UPDATE lucky_wheel_spins
        SET zbs_status = 'sending', zbs_error = NULL
      WHERE id = ? AND discount_code_id IS NOT NULL AND zbs_status IN (${placeholders})`,
    [spinId, ...fromStatuses],
  );

  return result.affectedRows > 0;
}

/** SRX_web gọi sau mỗi lượt trúng voucher. Lượt không còn 'pending' thì bỏ qua. */
export async function sendSrxLuckyWheelSpinZbs(spinId: string): Promise<void> {
  await ensureLuckyWheelTables();

  if (await claimSpinZbs(spinId, ["pending"])) {
    await deliverSpinZbs(spinId);
  }
}

/** Admin gửi lại từ CRM (lần trước lỗi, hoặc CRM chưa nhận được lệnh từ website). */
export async function resendSrxLuckyWheelSpinZbs(spinId: string): Promise<SrxLuckyWheelSpin | null> {
  await ensureLuckyWheelTables();

  if (!(await claimSpinZbs(spinId, ["failed", "pending", "none"]))) {
    throw new Error("Lượt quay không có mã voucher, hoặc tin đã gửi / đang gửi");
  }

  await deliverSpinZbs(spinId);

  const [rows] = await getSrxDB().query<RowDataPacket[]>(`${SPIN_SELECT} WHERE s.id = ? LIMIT 1`, [spinId]);

  return rows[0] ? mapSpin(rows[0]) : null;
}

const testInputSchema = z.object({
  phone: z.string().trim().min(9, "Nhập số điện thoại nhận tin thử"),
});

/** Thời điểm bắt đầu / hết hạn giống một mã thật tạo lúc này (giờ của SQL). */
async function readSampleVoucherDates(): Promise<{ startDate: string; expire: string }> {
  const [rows] = await getSrxDB().query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(NOW(), '${SQL_ZALO_DATE_FORMAT}') AS start_date,
            DATE_FORMAT(TIMESTAMP(DATE(NOW() + INTERVAL 3 MONTH), '23:59:59'), '${SQL_ZALO_DATE_FORMAT}') AS expire`,
  );

  return { startDate: String(rows[0]?.start_date ?? ""), expire: String(rows[0]?.expire ?? "") };
}

/** Gửi thử theo cấu hình đang lưu, với một mã mẫu (không tạo mã giảm giá thật). */
export async function sendSrxLuckyWheelZbsTest(input: unknown): Promise<DeliveryResult> {
  const phone = normalizeZbsPhone(testInputSchema.parse(input).phone);

  if (!phone) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  const [settings, dates] = await Promise.all([getSrxLuckyWheelSettings(), readSampleVoucherDates()]);
  const result = await sendZaloZbsTemplateMessage({
    phone,
    templateId: settings.zbs_template_id,
    tokenName: settings.zbs_token_name,
    trackingId: `lwtest${Date.now()}`,
    templateData: buildSrxLuckyWheelZbsTemplateData({
      customerName: "Khách hàng SRX",
      customerCode: buildCustomerCode(0),
      voucherCode: "12345678",
      discountType: "fixed_amount",
      discountValue: 100_000,
      maxDiscountAmount: null,
      minOrderAmount: 300_000,
      ...dates,
    }),
  });

  return result.ok ? { ok: true } : { ok: false, errorMessage: result.errorMessage };
}
