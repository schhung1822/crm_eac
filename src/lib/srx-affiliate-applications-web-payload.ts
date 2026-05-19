import { z } from "zod";

const applicationSchema = z.object({
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(6).max(32),
  facebookUrl: z.string().trim().max(1000).nullish(),
  gender: z.string().trim().max(32).nullish(),
  legalFullName: z.string().trim().min(2).max(255),
  nationalIdNumber: z.string().trim().min(6).max(64),
  permanentAddress: z.string().trim().min(6).max(1000),
  status: z.string().trim().max(64).nullish(),
  tiktokUrl: z.string().trim().max(1000).nullish(),
});

export const srxAffiliateApplicationsWebPayloadSchema = z
  .object({
    accountLabel: z.string().trim().min(1).max(255),
    application: applicationSchema,
    resubmitted: z.boolean().optional().default(false),
    siteOrigin: z.string().trim().url().nullish(),
    source: z.string().trim().max(255).nullish(),
  })
  .strict();

export type SrxAffiliateApplicationsWebPayload = z.infer<typeof srxAffiliateApplicationsWebPayloadSchema>;

export function parseSrxAffiliateApplicationsWebPayload(value: unknown): SrxAffiliateApplicationsWebPayload {
  return srxAffiliateApplicationsWebPayloadSchema.parse(value);
}
