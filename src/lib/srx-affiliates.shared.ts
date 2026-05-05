import { z } from "zod";

export const srxAffiliateAccountStatusValues = ["active", "inactive", "suspended"] as const;
export const srxAffiliateAccountStatusSchema = z.enum(srxAffiliateAccountStatusValues);

export const srxAffiliateApplicationStatusValues = ["pending", "approved", "rejected"] as const;
export const srxAffiliateApplicationStatusSchema = z.enum(srxAffiliateApplicationStatusValues);

export const srxAffiliateCommissionTypeValues = ["percent", "fixed"] as const;
export const srxAffiliateCommissionTypeSchema = z.enum(srxAffiliateCommissionTypeValues);

export const srxAffiliateReferralStatusValues = ["pending", "approved", "paid", "rejected", "cancelled"] as const;
export const srxAffiliateReferralStatusSchema = z.enum(srxAffiliateReferralStatusValues);

export const srxAffiliatePayoutStatusValues = ["pending", "processing", "paid", "cancelled"] as const;
export const srxAffiliatePayoutStatusSchema = z.enum(srxAffiliatePayoutStatusValues);

export const srxAffiliateUserStatusValues = ["pending_verification", "active", "inactive", "banned"] as const;
export const srxAffiliateUserStatusSchema = z.enum(srxAffiliateUserStatusValues);

export const srxAffiliateAccountSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string(),
  user_phone: z.string(),
  affiliate_code: z.string(),
  status: srxAffiliateAccountStatusSchema,
  commission_type: srxAffiliateCommissionTypeSchema,
  commission_rate: z.number(),
  cookie_duration_days: z.number().int().nonnegative(),
  total_clicks: z.number().int().nonnegative(),
  total_orders: z.number().int().nonnegative(),
  approved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  application_id: z.string().nullable(),
  application_status: srxAffiliateApplicationStatusSchema.nullable(),
  application_review_note: z.string(),
  application_contact_email: z.string(),
  application_contact_phone: z.string(),
  application_social_channel: z.string(),
  application_website_url: z.string(),
  application_created_at: z.coerce.date().nullable(),
  application_reviewed_at: z.coerce.date().nullable(),
  bank_account_holder: z.string(),
  bank_name: z.string(),
  bank_branch: z.string(),
  bank_account_number: z.string(),
  link_count: z.number().int().nonnegative(),
  active_link_count: z.number().int().nonnegative(),
  referral_count: z.number().int().nonnegative(),
  pending_referral_count: z.number().int().nonnegative(),
  approved_referral_count: z.number().int().nonnegative(),
  paid_referral_count: z.number().int().nonnegative(),
  rejected_referral_count: z.number().int().nonnegative(),
  cancelled_referral_count: z.number().int().nonnegative(),
  pending_commission_amount: z.number().nonnegative(),
  approved_commission_amount: z.number().nonnegative(),
  paid_commission_amount: z.number().nonnegative(),
  rejected_commission_amount: z.number().nonnegative(),
  cancelled_commission_amount: z.number().nonnegative(),
  payout_count: z.number().int().nonnegative(),
  pending_payout_amount: z.number().nonnegative(),
  paid_out_amount: z.number().nonnegative(),
  latest_payout_status: srxAffiliatePayoutStatusSchema.nullable(),
});

export const srxAffiliateApplicationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string(),
  user_phone: z.string(),
  user_status: srxAffiliateUserStatusSchema,
  affiliate_account_id: z.string().nullable(),
  affiliate_code: z.string(),
  affiliate_account_status: srxAffiliateAccountStatusSchema.nullable(),
  affiliate_approved_at: z.coerce.date().nullable(),
  legal_full_name: z.string(),
  permanent_address: z.string(),
  national_id_number: z.string(),
  gender: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  social_channel: z.string(),
  website_url: z.string(),
  facebook_url: z.string(),
  tiktok_url: z.string(),
  promotion_plan: z.string(),
  status: srxAffiliateApplicationStatusSchema,
  review_note: z.string(),
  reviewed_by_user_id: z.string().nullable(),
  reviewed_by_user_name: z.string(),
  reviewed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type SrxAffiliateAccount = z.infer<typeof srxAffiliateAccountSchema>;
export type SrxAffiliateApplication = z.infer<typeof srxAffiliateApplicationSchema>;
export type SrxAffiliateApplicationStatus = z.infer<typeof srxAffiliateApplicationStatusSchema>;

const srxAffiliateManagementMutationSchema = z.object({
  status: srxAffiliateAccountStatusSchema,
  application_status: srxAffiliateApplicationStatusSchema.optional(),
  review_note: z.string().trim().max(5000).optional().default(""),
});

const srxAffiliateCommissionMutationSchema = z.object({
  commission_type: srxAffiliateCommissionTypeSchema,
  commission_rate: z.string().trim().min(1).max(40),
  cookie_duration_days: z.coerce.number().int().min(1).max(3650),
});

const srxAffiliateApplicationReviewMutationSchema = z.object({
  status: srxAffiliateApplicationStatusSchema,
  review_note: z.string().trim().max(5000).optional().default(""),
});

export type SrxAffiliateManagementMutationInput = z.infer<typeof srxAffiliateManagementMutationSchema>;
export type SrxAffiliateCommissionMutationInput = z.infer<typeof srxAffiliateCommissionMutationSchema>;
export type SrxAffiliateApplicationReviewMutationInput = z.infer<typeof srxAffiliateApplicationReviewMutationSchema>;

export function parseSrxAffiliateAccount(input: unknown): SrxAffiliateAccount {
  return srxAffiliateAccountSchema.parse(input);
}

export function parseSrxAffiliateApplication(input: unknown): SrxAffiliateApplication {
  return srxAffiliateApplicationSchema.parse(input);
}

export function parseSrxAffiliateManagementInput(input: unknown): SrxAffiliateManagementMutationInput {
  return srxAffiliateManagementMutationSchema.parse(input);
}

export function parseSrxAffiliateCommissionInput(input: unknown): SrxAffiliateCommissionMutationInput {
  return srxAffiliateCommissionMutationSchema.parse(input);
}

export function parseSrxAffiliateApplicationReviewInput(input: unknown): SrxAffiliateApplicationReviewMutationInput {
  return srxAffiliateApplicationReviewMutationSchema.parse(input);
}
