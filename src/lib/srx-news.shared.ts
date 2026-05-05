import { z } from "zod";

export const srxNewsStatusValues = ["draft", "published", "archived"] as const;
export const srxNewsStatusSchema = z.enum(srxNewsStatusValues);

export const srxNewsCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
  post_count: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const srxNewsTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  post_count: z.number(),
  created_at: z.coerce.date(),
});

export const srxNewsPostTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const srxNewsPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  featured_image_url: z.string(),
  status: srxNewsStatusSchema,
  is_featured: z.boolean(),
  view_count: z.number(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  category_id: z.string(),
  category_name: z.string(),
  category_slug: z.string(),
  tag_ids: z.array(z.string()),
  tags: z.array(srxNewsPostTagSchema),
});

export type SrxNewsCategory = z.infer<typeof srxNewsCategorySchema>;
export type SrxNewsTag = z.infer<typeof srxNewsTagSchema>;
export type SrxNewsPost = z.infer<typeof srxNewsPostSchema>;

const srxNewsCategoryMutationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  is_active: z.boolean().optional().default(true),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

const srxNewsTagMutationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(120).optional().default(""),
});

const srxNewsPostMutationSchema = z.object({
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().max(250).optional().default(""),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(1),
  featured_image_url: z.string().trim().max(500).optional().default(""),
  category_id: z.string().regex(/^\d+$/),
  tag_ids: z.array(z.string().regex(/^\d+$/)).optional().default([]),
  status: srxNewsStatusSchema,
  is_featured: z.boolean().optional().default(false),
  published_at: z.string().trim().optional().default(""),
});

export type SrxNewsCategoryMutationInput = z.infer<typeof srxNewsCategoryMutationSchema>;
export type SrxNewsTagMutationInput = z.infer<typeof srxNewsTagMutationSchema>;
export type SrxNewsPostMutationInput = z.infer<typeof srxNewsPostMutationSchema>;

export function parseSrxNewsCategoryInput(input: unknown): SrxNewsCategoryMutationInput {
  return srxNewsCategoryMutationSchema.parse(input);
}

export function parseSrxNewsCategory(input: unknown): SrxNewsCategory {
  return srxNewsCategorySchema.parse(input);
}

export function parseSrxNewsTagInput(input: unknown): SrxNewsTagMutationInput {
  return srxNewsTagMutationSchema.parse(input);
}

export function parseSrxNewsTag(input: unknown): SrxNewsTag {
  return srxNewsTagSchema.parse(input);
}

export function parseSrxNewsPostInput(input: unknown): SrxNewsPostMutationInput {
  return srxNewsPostMutationSchema.parse(input);
}

export function parseSrxNewsPost(input: unknown): SrxNewsPost {
  return srxNewsPostSchema.parse(input);
}
