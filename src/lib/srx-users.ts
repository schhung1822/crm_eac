import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

import { withSrxReadFallback } from "@/lib/srx-db-errors";
import { getSrxDB } from "@/lib/srx-db";

export const srxUserStatusValues = ["pending_verification", "active", "inactive", "banned"] as const;

export const srxUserStatusSchema = z.enum(srxUserStatusValues);

export const srxCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  display_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  gender: z.string(),
  status: srxUserStatusSchema,
  date_of_birth: z.date().nullable(),
  avatar_url: z.string(),
  is_email_verified: z.boolean(),
  last_login_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  default_address: z.string(),
  address_label: z.string(),
  recipient_name: z.string(),
  recipient_phone: z.string(),
  order_count: z.number(),
  total_spent: z.number(),
  last_order_at: z.date().nullable(),
});

export type SrxCustomer = z.infer<typeof srxCustomerSchema>;

const srxCustomerUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1).max(150).optional(),
    display_name: z.string().trim().max(100).nullable().optional(),
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    status: srxUserStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one customer field must be updated.",
  });

export type UpdateSrxCustomerInput = z.infer<typeof srxCustomerUpdateSchema>;

type SrxCustomerRow = RowDataPacket & {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: (typeof srxUserStatusValues)[number];
  date_of_birth: Date | string | null;
  avatar_url: string | null;
  email_verified_at: Date | string | null;
  last_login_at: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  default_address: string | null;
  address_label: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  order_count: number | string | null;
  total_spent: number | string | null;
  last_order_at: Date | string | null;
};

const srxCustomerBaseQuery = `
  SELECT
    CAST(u.id AS CHAR) AS id,
    u.full_name,
    u.display_name,
    u.email,
    u.phone,
    u.gender,
    u.status,
    u.date_of_birth,
    u.avatar_url,
    u.email_verified_at,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    COALESCE(addresses.default_address, '') AS default_address,
    COALESCE(addresses.address_label, '') AS address_label,
    COALESCE(addresses.recipient_name, '') AS recipient_name,
    COALESCE(addresses.recipient_phone, '') AS recipient_phone,
    COALESCE(order_stats.order_count, 0) AS order_count,
    COALESCE(order_stats.total_spent, 0) AS total_spent,
    order_stats.last_order_at
  FROM users u
  LEFT JOIN (
    SELECT
      ua.user_id,
      MAX(CASE WHEN ua.is_default = 1 THEN ua.label END) AS address_label,
      MAX(CASE WHEN ua.is_default = 1 THEN ua.recipient_name END) AS recipient_name,
      MAX(CASE WHEN ua.is_default = 1 THEN ua.recipient_phone END) AS recipient_phone,
      MAX(
        CASE
          WHEN ua.is_default = 1
            THEN CONCAT_WS(
              ', ',
              NULLIF(ua.address_line, ''),
              NULLIF(ua.ward, ''),
              NULLIF(ua.district, ''),
              NULLIF(ua.province, '')
            )
        END
      ) AS default_address
    FROM user_addresses ua
    GROUP BY ua.user_id
  ) addresses ON addresses.user_id = u.id
  LEFT JOIN (
    SELECT
      o.user_id,
      COUNT(*) AS order_count,
      SUM(o.grand_total) AS total_spent,
      MAX(o.placed_at) AS last_order_at
    FROM orders o
    WHERE o.user_id IS NOT NULL
    GROUP BY o.user_id
  ) order_stats ON order_stats.user_id = u.id
  WHERE u.deleted_at IS NULL
`;

function asDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseCustomerRow(row: SrxCustomerRow): SrxCustomer {
  const createdAt = asDate(row.created_at) ?? new Date(0);
  const updatedAt = asDate(row.updated_at) ?? createdAt;
  const displayName = normalizeOptionalString(row.display_name) || normalizeOptionalString(row.full_name);

  return srxCustomerSchema.parse({
    id: row.id,
    full_name: normalizeOptionalString(row.full_name),
    display_name: displayName,
    email: normalizeOptionalString(row.email),
    phone: normalizeOptionalString(row.phone),
    gender: normalizeOptionalString(row.gender),
    status: row.status,
    date_of_birth: asDate(row.date_of_birth),
    avatar_url: normalizeOptionalString(row.avatar_url),
    is_email_verified: asDate(row.email_verified_at) !== null,
    last_login_at: asDate(row.last_login_at),
    created_at: createdAt,
    updated_at: updatedAt,
    default_address: normalizeOptionalString(row.default_address),
    address_label: normalizeOptionalString(row.address_label),
    recipient_name: normalizeOptionalString(row.recipient_name),
    recipient_phone: normalizeOptionalString(row.recipient_phone),
    order_count: Number(row.order_count ?? 0) || 0,
    total_spent: Number(row.total_spent ?? 0) || 0,
    last_order_at: asDate(row.last_order_at),
  });
}

export function parseUpdateSrxCustomerInput(input: unknown): UpdateSrxCustomerInput {
  return srxCustomerUpdateSchema.parse(input);
}

export async function getSrxCustomers(): Promise<SrxCustomer[]> {
  return withSrxReadFallback("customers", [], async () => {
    const db = getSrxDB();
    const [rows] = await db.query<SrxCustomerRow[]>(
      `
        ${srxCustomerBaseQuery}
        ORDER BY u.created_at DESC
      `,
    );

    return rows.map(parseCustomerRow);
  });
}

export async function getSrxCustomerById(id: string): Promise<SrxCustomer | null> {
  return withSrxReadFallback("customer detail", null, async () => {
    const db = getSrxDB();
    const [rows] = await db.query<SrxCustomerRow[]>(
      `
        ${srxCustomerBaseQuery}
        AND u.id = ?
        LIMIT 1
      `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return parseCustomerRow(rows[0]);
  });
}

export async function updateSrxCustomer(id: string, input: UpdateSrxCustomerInput): Promise<SrxCustomer | null> {
  const payload = parseUpdateSrxCustomerInput(input);
  const db = getSrxDB();

  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (payload.full_name !== undefined) {
    updates.push("full_name = ?");
    values.push(payload.full_name.trim());
  }

  if (payload.display_name !== undefined) {
    updates.push("display_name = ?");
    values.push(normalizeNullableString(payload.display_name));
  }

  if (payload.email !== undefined) {
    updates.push("email = ?");
    values.push(payload.email.trim().toLowerCase());
  }

  if (payload.phone !== undefined) {
    updates.push("phone = ?");
    values.push(normalizeNullableString(payload.phone));
  }

  if (payload.status !== undefined) {
    updates.push("status = ?");
    values.push(payload.status);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  const [result] = await db.execute<ResultSetHeader>(
    `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = ? AND deleted_at IS NULL
    `,
    [...values, id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSrxCustomerById(id);
}
