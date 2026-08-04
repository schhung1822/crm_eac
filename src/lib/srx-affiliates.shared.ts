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

export const srxAffiliateGenderValues = ["male", "female", "other", "prefer_not_to_say"] as const;
export const srxAffiliateGenderSchema = z.enum(srxAffiliateGenderValues);

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
  application_legal_full_name: z.string(),
  application_permanent_address: z.string(),
  application_national_id_number: z.string(),
  application_gender: srxAffiliateGenderSchema,
  application_facebook_url: z.string(),
  application_tiktok_url: z.string(),
  application_promotion_plan: z.string(),
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

export const srxAffiliateUserOptionSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  status: srxAffiliateUserStatusSchema,
  has_application: z.boolean(),
});

export type SrxAffiliateAccount = z.infer<typeof srxAffiliateAccountSchema>;
export type SrxAffiliateApplication = z.infer<typeof srxAffiliateApplicationSchema>;
export type SrxAffiliateApplicationStatus = z.infer<typeof srxAffiliateApplicationStatusSchema>;
export type SrxAffiliateUserOption = z.infer<typeof srxAffiliateUserOptionSchema>;

const affiliateAccountSettingFields = {
  affiliate_code: z.string().trim().max(30).optional().default(""),
  status: srxAffiliateAccountStatusSchema.optional().default("active"),
  commission_type: srxAffiliateCommissionTypeSchema.optional().default("percent"),
  commission_rate: z.string().trim().min(1).max(40).optional().default("5"),
  cookie_duration_days: z.coerce.number().int().min(1).max(3650).optional().default(30),
};

const affiliateProfileFields = {
  application_status: srxAffiliateApplicationStatusSchema.optional().default("approved"),
  review_note: z.string().trim().max(5000).optional().default(""),
  legal_full_name: z.string().trim().max(150).optional().default(""),
  permanent_address: z.string().trim().max(255).optional().default(""),
  national_id_number: z.string().trim().max(30).optional().default(""),
  gender: srxAffiliateGenderSchema.optional().default("prefer_not_to_say"),
  contact_email: z.string().trim().max(255).optional().default(""),
  contact_phone: z.string().trim().max(20).optional().default(""),
  social_channel: z.string().trim().max(255).optional().default(""),
  website_url: z.string().trim().max(500).optional().default(""),
  facebook_url: z.string().trim().max(500).optional().default(""),
  tiktok_url: z.string().trim().max(500).optional().default(""),
  promotion_plan: z.string().trim().max(5000).optional().default(""),
};

const affiliateBankFields = {
  bank_account_holder: z.string().trim().max(150).optional().default(""),
  bank_name: z.string().trim().max(150).optional().default(""),
  bank_branch: z.string().trim().max(150).optional().default(""),
  bank_account_number: z.string().trim().max(50).optional().default(""),
};

const srxAffiliateAccountUpdateMutationSchema = z.object({
  user_full_name: z.string().trim().min(2).max(150),
  user_email: z.string().trim().email().max(255),
  user_phone: z.string().trim().max(20).optional().default(""),
  ...affiliateAccountSettingFields,
  ...affiliateProfileFields,
  ...affiliateBankFields,
});

const srxAffiliateAccountCreateMutationSchema = z
  .object({
    user_mode: z.enum(["existing", "new"]).optional().default("existing"),
    user_id: z.string().trim().max(20).optional().default(""),
    new_user_full_name: z.string().trim().max(150).optional().default(""),
    new_user_email: z.string().trim().max(255).optional().default(""),
    new_user_phone: z.string().trim().max(20).optional().default(""),
    new_user_password: z.string().max(72).optional().default(""),
    ...affiliateAccountSettingFields,
    ...affiliateProfileFields,
    ...affiliateBankFields,
  })
  .superRefine((value, ctx) => {
    if (value.user_mode === "existing") {
      if (!/^\d+$/.test(value.user_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["user_id"],
          message: "Hãy chọn người dùng website cho affiliate này",
        });
      }

      return;
    }

    if (value.new_user_full_name.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["new_user_full_name"],
        message: "Họ tên người dùng mới là bắt buộc",
      });
    }

    if (!z.string().email().safeParse(value.new_user_email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["new_user_email"],
        message: "Email người dùng mới không hợp lệ",
      });
    }

    if (value.new_user_password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["new_user_password"],
        message: "Mật khẩu đăng nhập phải có ít nhất 8 ký tự",
      });
    }
  });

const srxAffiliateApplicationReviewMutationSchema = z.object({
  status: srxAffiliateApplicationStatusSchema,
  review_note: z.string().trim().max(5000).optional().default(""),
});

export type SrxAffiliateAccountUpdateMutationInput = z.infer<typeof srxAffiliateAccountUpdateMutationSchema>;
export type SrxAffiliateAccountCreateMutationInput = z.infer<typeof srxAffiliateAccountCreateMutationSchema>;
export type SrxAffiliateApplicationReviewMutationInput = z.infer<typeof srxAffiliateApplicationReviewMutationSchema>;

export function parseSrxAffiliateAccount(input: unknown): SrxAffiliateAccount {
  return srxAffiliateAccountSchema.parse(input);
}

export function parseSrxAffiliateApplication(input: unknown): SrxAffiliateApplication {
  return srxAffiliateApplicationSchema.parse(input);
}

export function parseSrxAffiliateUserOption(input: unknown): SrxAffiliateUserOption {
  return srxAffiliateUserOptionSchema.parse(input);
}

export function parseSrxAffiliateAccountUpdateInput(input: unknown): SrxAffiliateAccountUpdateMutationInput {
  return srxAffiliateAccountUpdateMutationSchema.parse(input);
}

export function parseSrxAffiliateAccountCreateInput(input: unknown): SrxAffiliateAccountCreateMutationInput {
  return srxAffiliateAccountCreateMutationSchema.parse(input);
}

export function parseSrxAffiliateApplicationReviewInput(input: unknown): SrxAffiliateApplicationReviewMutationInput {
  return srxAffiliateApplicationReviewMutationSchema.parse(input);
}
