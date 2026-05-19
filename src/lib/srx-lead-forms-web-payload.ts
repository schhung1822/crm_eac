import { z } from "zod";

export const srxLeadFormsWebPayloadSchema = z
  .object({
    brandName: z.string().trim().max(255).nullish(),
    businessField: z.string().trim().max(255).nullish(),
    consultationRequest: z.string().trim().min(1).max(3000),
    customerName: z.string().trim().min(2).max(255),
    email: z.string().trim().email(),
    formType: z.string().trim().min(1).max(64),
    pagePath: z.string().trim().max(255).nullish(),
    pageUrl: z.string().trim().max(1000).nullish(),
    phone: z.string().trim().min(8).max(32),
    sourceKey: z.string().trim().max(120).nullish(),
    sourceLabel: z.string().trim().min(1).max(255),
  })
  .strict();

export type SrxLeadFormsWebPayload = z.infer<typeof srxLeadFormsWebPayloadSchema>;

export function parseSrxLeadFormsWebPayload(value: unknown): SrxLeadFormsWebPayload {
  return srxLeadFormsWebPayloadSchema.parse(value);
}
