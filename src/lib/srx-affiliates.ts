/* eslint-disable complexity, import/no-unresolved, max-lines */
import "server-only";

import { randomBytes } from "node:crypto";

import { prisma2 } from "@/lib/prisma2";
import {
  parseSrxAffiliateApplicationReviewInput,
  parseSrxAffiliateCommissionInput,
  parseSrxAffiliateManagementInput,
  srxAffiliateAccountSchema,
  srxAffiliateApplicationSchema,
  type SrxAffiliateAccount,
  type SrxAffiliateApplication,
  type SrxAffiliateApplicationReviewMutationInput,
  type SrxAffiliateCommissionMutationInput,
  type SrxAffiliateManagementMutationInput,
} from "@/lib/srx-affiliates.shared";

import { Prisma } from "../../prisma/generated/srx-app-client";

const affiliateAccountInclude = Prisma.validator<Prisma.affiliate_accountsInclude>()({
  users: {
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  affiliate_applications: {
    select: {
      id: true,
      status: true,
      review_note: true,
      contact_email: true,
      contact_phone: true,
      social_channel: true,
      website_url: true,
      created_at: true,
      reviewed_at: true,
      reviewed_by_user_id: true,
    },
  },
  affiliate_bank_accounts: {
    select: {
      account_holder_name: true,
      bank_name: true,
      bank_branch: true,
      account_number: true,
    },
  },
  affiliate_links: {
    select: {
      id: true,
      is_active: true,
    },
  },
  affiliate_referrals: {
    select: {
      id: true,
      status: true,
      commission_amount: true,
    },
  },
  affiliate_payouts: {
    select: {
      id: true,
      total_commission: true,
      payout_status: true,
      created_at: true,
      paid_at: true,
    },
  },
});

const affiliateApplicationInclude = Prisma.validator<Prisma.affiliate_applicationsInclude>()({
  users_affiliate_applications_user_idTousers: {
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  users_affiliate_applications_reviewed_by_user_idTousers: {
    select: {
      id: true,
      full_name: true,
    },
  },
  affiliate_accounts: {
    select: {
      id: true,
      affiliate_code: true,
      status: true,
      approved_at: true,
    },
  },
});

type AffiliateAccountRecord = Prisma.affiliate_accountsGetPayload<{
  include: typeof affiliateAccountInclude;
}>;

type AffiliateApplicationRecord = Prisma.affiliate_applicationsGetPayload<{
  include: typeof affiliateApplicationInclude;
}>;

function normalizeOptionalString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(typeof value === "number" ? value : value.toString());
}

function parseCommissionRate(rate: string, commissionType: SrxAffiliateAccount["commission_type"]): string {
  const trimmed = rate.trim();

  if (!trimmed) {
    throw new Error("Tỷ lệ hoa hồng là bắt buộc");
  }

  const numeric = Number(trimmed);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Tỷ lệ hoa hồng không hợp lệ");
  }

  if (commissionType === "percent" && numeric > 100) {
    throw new Error("Hoa hồng theo phần trăm phải nằm trong khoảng 0 - 100");
  }

  return trimmed;
}

function isMissingAffiliateTableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function wrapMissingAffiliateTableError(error: unknown): never {
  if (isMissingAffiliateTableError(error)) {
    throw new Error("Thiếu bảng affiliate SRX trong database. Hãy kiểm tra schema website trước khi sử dụng mục này.");
  }

  throw error;
}

function normalizeAffiliateCodeSource(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function buildAffiliateCodeCandidate(userName: string, userId: bigint): string {
  const nameSegment = normalizeAffiliateCodeSource(userName).slice(0, 6) || "AFF";
  const userSegment = userId.toString(36).toUpperCase();
  const randomSegment = randomBytes(3).toString("hex").toUpperCase();

  return `SRX${nameSegment}${userSegment}${randomSegment}`.slice(0, 30);
}

function mapAffiliateAccount(record: AffiliateAccountRecord): SrxAffiliateAccount {
  const referralSummary = {
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
    rejectedCount: 0,
    cancelledCount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    rejectedAmount: 0,
    cancelledAmount: 0,
  };

  for (const referral of record.affiliate_referrals) {
    const commissionAmount = toNumber(referral.commission_amount);

    switch (referral.status) {
      case "pending":
        referralSummary.pendingCount += 1;
        referralSummary.pendingAmount += commissionAmount;
        break;
      case "approved":
        referralSummary.approvedCount += 1;
        referralSummary.approvedAmount += commissionAmount;
        break;
      case "paid":
        referralSummary.paidCount += 1;
        referralSummary.paidAmount += commissionAmount;
        break;
      case "rejected":
        referralSummary.rejectedCount += 1;
        referralSummary.rejectedAmount += commissionAmount;
        break;
      case "cancelled":
        referralSummary.cancelledCount += 1;
        referralSummary.cancelledAmount += commissionAmount;
        break;
      default:
        break;
    }
  }

  const latestPayout =
    record.affiliate_payouts.length > 0
      ? [...record.affiliate_payouts].sort((left, right) => right.created_at.getTime() - left.created_at.getTime())[0]
      : null;

  const pendingPayoutAmount = record.affiliate_payouts
    .filter((payout) => payout.payout_status === "pending" || payout.payout_status === "processing")
    .reduce((sum, payout) => sum + toNumber(payout.total_commission), 0);

  const paidOutAmount = record.affiliate_payouts
    .filter((payout) => payout.payout_status === "paid")
    .reduce((sum, payout) => sum + toNumber(payout.total_commission), 0);

  return srxAffiliateAccountSchema.parse({
    id: record.id.toString(),
    user_id: record.user_id.toString(),
    user_name: record.users.full_name,
    user_email: record.users.email,
    user_phone: normalizeOptionalString(record.users.phone),
    affiliate_code: record.affiliate_code,
    status: record.status,
    commission_type: record.commission_type,
    commission_rate: toNumber(record.commission_rate),
    cookie_duration_days: record.cookie_duration_days,
    total_clicks: record.total_clicks,
    total_orders: record.total_orders,
    approved_at: record.approved_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    application_id: record.affiliate_applications?.id.toString() ?? null,
    application_status: record.affiliate_applications?.status ?? null,
    application_review_note: normalizeOptionalString(record.affiliate_applications?.review_note),
    application_contact_email: normalizeOptionalString(record.affiliate_applications?.contact_email),
    application_contact_phone: normalizeOptionalString(record.affiliate_applications?.contact_phone),
    application_social_channel: normalizeOptionalString(record.affiliate_applications?.social_channel),
    application_website_url: normalizeOptionalString(record.affiliate_applications?.website_url),
    application_created_at: record.affiliate_applications?.created_at ?? null,
    application_reviewed_at: record.affiliate_applications?.reviewed_at ?? null,
    bank_account_holder: normalizeOptionalString(record.affiliate_bank_accounts?.account_holder_name),
    bank_name: normalizeOptionalString(record.affiliate_bank_accounts?.bank_name),
    bank_branch: normalizeOptionalString(record.affiliate_bank_accounts?.bank_branch),
    bank_account_number: normalizeOptionalString(record.affiliate_bank_accounts?.account_number),
    link_count: record.affiliate_links.length,
    active_link_count: record.affiliate_links.filter((link) => link.is_active).length,
    referral_count: record.affiliate_referrals.length,
    pending_referral_count: referralSummary.pendingCount,
    approved_referral_count: referralSummary.approvedCount,
    paid_referral_count: referralSummary.paidCount,
    rejected_referral_count: referralSummary.rejectedCount,
    cancelled_referral_count: referralSummary.cancelledCount,
    pending_commission_amount: referralSummary.pendingAmount,
    approved_commission_amount: referralSummary.approvedAmount,
    paid_commission_amount: referralSummary.paidAmount,
    rejected_commission_amount: referralSummary.rejectedAmount,
    cancelled_commission_amount: referralSummary.cancelledAmount,
    payout_count: record.affiliate_payouts.length,
    pending_payout_amount: pendingPayoutAmount,
    paid_out_amount: paidOutAmount,
    latest_payout_status: latestPayout ? latestPayout.payout_status : null,
  });
}

function mapAffiliateApplication(record: AffiliateApplicationRecord): SrxAffiliateApplication {
  return srxAffiliateApplicationSchema.parse({
    id: record.id.toString(),
    user_id: record.user_id.toString(),
    user_name: normalizeOptionalString(record.users_affiliate_applications_user_idTousers.full_name),
    user_email: normalizeOptionalString(record.users_affiliate_applications_user_idTousers.email),
    user_phone: normalizeOptionalString(record.users_affiliate_applications_user_idTousers.phone),
    user_status: record.users_affiliate_applications_user_idTousers.status,
    affiliate_account_id: record.affiliate_accounts?.id.toString() ?? null,
    affiliate_code: normalizeOptionalString(record.affiliate_accounts?.affiliate_code),
    affiliate_account_status: record.affiliate_accounts?.status ?? null,
    affiliate_approved_at: record.affiliate_accounts?.approved_at ?? null,
    legal_full_name: normalizeOptionalString(record.legal_full_name),
    permanent_address: normalizeOptionalString(record.permanent_address),
    national_id_number: normalizeOptionalString(record.national_id_number),
    gender: record.gender,
    contact_email: normalizeOptionalString(record.contact_email),
    contact_phone: normalizeOptionalString(record.contact_phone),
    social_channel: normalizeOptionalString(record.social_channel),
    website_url: normalizeOptionalString(record.website_url),
    facebook_url: normalizeOptionalString(record.facebook_url),
    tiktok_url: normalizeOptionalString(record.tiktok_url),
    promotion_plan: normalizeOptionalString(record.promotion_plan),
    status: record.status,
    review_note: normalizeOptionalString(record.review_note),
    reviewed_by_user_id: record.reviewed_by_user_id?.toString() ?? null,
    reviewed_by_user_name: normalizeOptionalString(
      record.users_affiliate_applications_reviewed_by_user_idTousers?.full_name,
    ),
    reviewed_at: record.reviewed_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
  });
}

async function activateAffiliateUser(tx: Prisma.TransactionClient, userId: bigint, userStatus: string): Promise<void> {
  if (userStatus === "active" || userStatus === "banned") {
    return;
  }

  await tx.users.update({
    where: {
      id: userId,
    },
    data: {
      status: "active",
    },
  });
}

async function generateUniqueAffiliateCode(
  tx: Prisma.TransactionClient,
  userName: string,
  userId: bigint,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildAffiliateCodeCandidate(userName, userId);
    const existing = await tx.affiliate_accounts.findUnique({
      where: {
        affiliate_code: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Không thể tạo mã affiliate duy nhất cho hồ sơ này.");
}

async function ensureAffiliateAccountForApprovedApplication(
  tx: Prisma.TransactionClient,
  application: AffiliateApplicationRecord,
  approvedAt: Date,
): Promise<void> {
  const existingAccount =
    application.affiliate_accounts ??
    (await tx.affiliate_accounts.findUnique({
      where: {
        user_id: application.user_id,
      },
      select: {
        id: true,
        approved_at: true,
      },
    }));

  if (existingAccount) {
    await tx.affiliate_accounts.update({
      where: {
        id: existingAccount.id,
      },
      data: {
        application_id: application.id,
        status: "active",
        approved_at: existingAccount.approved_at ?? approvedAt,
      },
    });
    return;
  }

  const affiliateCode = await generateUniqueAffiliateCode(
    tx,
    application.users_affiliate_applications_user_idTousers.full_name,
    application.user_id,
  );

  await tx.affiliate_accounts.create({
    data: {
      user_id: application.user_id,
      application_id: application.id,
      affiliate_code: affiliateCode,
      status: "active",
      approved_at: approvedAt,
    },
  });
}

async function getAffiliateAccountRecordById(id: bigint): Promise<AffiliateAccountRecord | null> {
  return prisma2.affiliate_accounts.findUnique({
    where: { id },
    include: affiliateAccountInclude,
  });
}

async function getAffiliateApplicationRecordById(id: bigint): Promise<AffiliateApplicationRecord | null> {
  return prisma2.affiliate_applications.findUnique({
    where: { id },
    include: affiliateApplicationInclude,
  });
}

export { parseSrxAffiliateApplicationReviewInput, parseSrxAffiliateCommissionInput, parseSrxAffiliateManagementInput };

export async function getSrxAffiliateAccounts(): Promise<SrxAffiliateAccount[]> {
  try {
    const accounts = await prisma2.affiliate_accounts.findMany({
      orderBy: [{ created_at: "desc" }],
      include: affiliateAccountInclude,
    });

    return accounts.map((account) => mapAffiliateAccount(account));
  } catch (error) {
    if (isMissingAffiliateTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getSrxAffiliateApplications(): Promise<SrxAffiliateApplication[]> {
  try {
    const applications = await prisma2.affiliate_applications.findMany({
      orderBy: [{ created_at: "desc" }],
      include: affiliateApplicationInclude,
    });

    return applications.map((application) => mapAffiliateApplication(application));
  } catch (error) {
    if (isMissingAffiliateTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getPendingSrxAffiliateApplicationCount(): Promise<number> {
  try {
    return await prisma2.affiliate_applications.count({
      where: {
        status: "pending",
      },
    });
  } catch (error) {
    if (isMissingAffiliateTableError(error)) {
      return 0;
    }

    throw error;
  }
}

export async function updateSrxAffiliateAccountManagement(
  accountId: string,
  input: SrxAffiliateManagementMutationInput,
  reviewedByUserId?: number,
): Promise<SrxAffiliateAccount | null> {
  try {
    const payload = parseSrxAffiliateManagementInput(input);
    const numericId = BigInt(accountId);
    const existing = await getAffiliateAccountRecordById(numericId);

    if (!existing) {
      return null;
    }

    const reviewNote = normalizeNullableString(payload.review_note);
    const currentReviewNote = normalizeNullableString(existing.affiliate_applications?.review_note);
    const shouldUpdateApplication =
      existing.affiliate_applications !== null &&
      (payload.application_status !== undefined || reviewNote !== currentReviewNote);
    const nextApplicationStatus = payload.application_status ?? existing.affiliate_applications?.status;
    const isApprovingApplication =
      existing.affiliate_applications !== null &&
      existing.affiliate_applications.status !== "approved" &&
      nextApplicationStatus === "approved";
    const nextAccountStatus = isApprovingApplication ? "active" : payload.status;
    const shouldActivateUser =
      nextApplicationStatus === "approved" &&
      nextAccountStatus === "active" &&
      existing.users.status !== "active" &&
      existing.users.status !== "banned";

    const reviewedAt = shouldUpdateApplication ? new Date() : undefined;
    const reviewerId = reviewedByUserId === undefined ? undefined : BigInt(reviewedByUserId);
    const approvedAt = existing.approved_at ?? (nextAccountStatus === "active" ? new Date() : undefined);

    await prisma2.$transaction(async (tx) => {
      await tx.affiliate_accounts.update({
        where: {
          id: numericId,
        },
        data: {
          status: nextAccountStatus,
          approved_at: approvedAt,
        },
      });

      if (shouldActivateUser) {
        await activateAffiliateUser(tx, existing.user_id, existing.users.status);
      }

      if (!shouldUpdateApplication || existing.affiliate_applications === null) {
        return;
      }

      await tx.affiliate_applications.update({
        where: {
          id: existing.affiliate_applications.id,
        },
        data: {
          status: payload.application_status ?? existing.affiliate_applications.status,
          review_note: reviewNote,
          reviewed_at: reviewedAt,
          reviewed_by_user_id: reviewerId ?? existing.affiliate_applications.reviewed_by_user_id ?? undefined,
        },
      });
    });

    const nextAccount = await getAffiliateAccountRecordById(numericId);
    return nextAccount ? mapAffiliateAccount(nextAccount) : null;
  } catch (error) {
    wrapMissingAffiliateTableError(error);
  }
}

export async function reviewSrxAffiliateApplication(
  applicationId: string,
  input: SrxAffiliateApplicationReviewMutationInput,
  reviewedByUserId?: number,
): Promise<SrxAffiliateApplication | null> {
  try {
    const payload = parseSrxAffiliateApplicationReviewInput(input);
    const numericId = BigInt(applicationId);
    const existing = await getAffiliateApplicationRecordById(numericId);

    if (!existing) {
      return null;
    }

    const reviewNote = normalizeNullableString(payload.review_note);
    const reviewedAt = new Date();
    const reviewerId = reviewedByUserId === undefined ? undefined : BigInt(reviewedByUserId);

    await prisma2.$transaction(async (tx) => {
      await tx.affiliate_applications.update({
        where: {
          id: numericId,
        },
        data: {
          status: payload.status,
          review_note: reviewNote,
          reviewed_at: reviewedAt,
          reviewed_by_user_id: reviewerId ?? existing.reviewed_by_user_id ?? undefined,
        },
      });

      if (payload.status !== "approved") {
        return;
      }

      await ensureAffiliateAccountForApprovedApplication(tx, existing, reviewedAt);

      await activateAffiliateUser(tx, existing.user_id, existing.users_affiliate_applications_user_idTousers.status);
    });

    const nextApplication = await getAffiliateApplicationRecordById(numericId);
    return nextApplication ? mapAffiliateApplication(nextApplication) : null;
  } catch (error) {
    wrapMissingAffiliateTableError(error);
  }
}

export async function updateSrxAffiliateAccountCommission(
  accountId: string,
  input: SrxAffiliateCommissionMutationInput,
): Promise<SrxAffiliateAccount | null> {
  try {
    const payload = parseSrxAffiliateCommissionInput(input);
    const numericId = BigInt(accountId);
    const existing = await prisma2.affiliate_accounts.findUnique({
      where: { id: numericId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const commissionRate = parseCommissionRate(payload.commission_rate, payload.commission_type);

    await prisma2.affiliate_accounts.update({
      where: {
        id: numericId,
      },
      data: {
        commission_type: payload.commission_type,
        commission_rate: commissionRate,
        cookie_duration_days: payload.cookie_duration_days,
      },
    });

    const nextAccount = await getAffiliateAccountRecordById(numericId);
    return nextAccount ? mapAffiliateAccount(nextAccount) : null;
  } catch (error) {
    wrapMissingAffiliateTableError(error);
  }
}
