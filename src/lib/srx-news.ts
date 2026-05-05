/* eslint-disable max-lines, no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import "server-only";

import { withSrxReadFallback } from "@/lib/srx-db-errors";
import { prisma2 } from "@/lib/prisma2";
import {
  parseSrxNewsCategoryInput,
  parseSrxNewsPostInput,
  parseSrxNewsTagInput,
  srxNewsCategorySchema,
  srxNewsPostSchema,
  srxNewsStatusValues,
  srxNewsTagSchema,
  type SrxNewsCategory,
  type SrxNewsCategoryMutationInput,
  type SrxNewsPost,
  type SrxNewsPostMutationInput,
  type SrxNewsTag,
  type SrxNewsTagMutationInput,
} from "@/lib/srx-news.shared";

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function slugify(value: string): string {
  return (
    value
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "unknown"
  );
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày giờ không hợp lệ");
  }

  return date;
}

function mapCategory(category: {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  _count?: { posts: number };
}): SrxNewsCategory {
  return srxNewsCategorySchema.parse({
    id: category.id.toString(),
    name: category.name,
    slug: category.slug,
    description: normalizeOptionalString(category.description),
    is_active: category.is_active,
    sort_order: category.sort_order,
    post_count: category._count?.posts ?? 0,
    created_at: category.created_at,
    updated_at: category.updated_at,
  });
}

function mapTag(tag: {
  id: bigint;
  name: string;
  slug: string;
  created_at: Date;
  _count?: { post_tag_links: number };
}): SrxNewsTag {
  return srxNewsTagSchema.parse({
    id: tag.id.toString(),
    name: tag.name,
    slug: tag.slug,
    post_count: tag._count?.post_tag_links ?? 0,
    created_at: tag.created_at,
  });
}

function mapPost(post: {
  id: bigint;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  status: (typeof srxNewsStatusValues)[number];
  is_featured: boolean;
  view_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  category_id: bigint;
  article_categories: { name: string; slug: string };
  post_tag_links: Array<{ post_tags: { id: bigint; name: string; slug: string } }>;
}): SrxNewsPost {
  const tags = post.post_tag_links.map(({ post_tags }) => ({
    id: post_tags.id.toString(),
    name: post_tags.name,
    slug: post_tags.slug,
  }));

  return srxNewsPostSchema.parse({
    id: post.id.toString(),
    title: post.title,
    slug: post.slug,
    excerpt: normalizeOptionalString(post.excerpt),
    content: post.content,
    featured_image_url: normalizeOptionalString(post.featured_image_url),
    status: post.status,
    is_featured: post.is_featured,
    view_count: post.view_count,
    published_at: post.published_at,
    created_at: post.created_at,
    updated_at: post.updated_at,
    category_id: post.category_id.toString(),
    category_name: post.article_categories.name,
    category_slug: post.article_categories.slug,
    tag_ids: tags.map((tag) => tag.id),
    tags,
  });
}

async function ensureUniqueCategorySlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.article_categories.findFirst({
        where,
        select: { id: true },
      })
    )?.id;

    if (existingId === undefined) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueTagSlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.post_tags.findFirst({
        where,
        select: { id: true },
      })
    )?.id;

    if (existingId === undefined) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniquePostSlug(baseSlug: string, excludeId?: bigint): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const where = excludeId === undefined ? { slug: candidate } : { slug: candidate, NOT: { id: excludeId } };
    const existingId = (
      await prisma2.posts.findFirst({
        where,
        select: { id: true },
      })
    )?.id;

    if (existingId === undefined) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export { parseSrxNewsCategoryInput, parseSrxNewsPostInput, parseSrxNewsTagInput };

export async function getSrxNewsCategories(): Promise<SrxNewsCategory[]> {
  return withSrxReadFallback("news categories", [], async () => {
    const categories = await prisma2.article_categories.findMany({
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return categories.map(mapCategory);
  });
}

export async function getSrxNewsTags(): Promise<SrxNewsTag[]> {
  return withSrxReadFallback("news tags", [], async () => {
    const tags = await prisma2.post_tags.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        _count: {
          select: {
            post_tag_links: true,
          },
        },
      },
    });

    return tags.map(mapTag);
  });
}

export async function getSrxNewsPosts(): Promise<SrxNewsPost[]> {
  return withSrxReadFallback("news posts", [], async () => {
    const posts = await prisma2.posts.findMany({
      orderBy: [{ created_at: "desc" }],
      include: {
        article_categories: true,
        post_tag_links: {
          include: {
            post_tags: true,
          },
        },
      },
    });

    return posts.map((post) =>
      mapPost({
        ...post,
        status: post.status as (typeof srxNewsStatusValues)[number],
      }),
    );
  });
}

export async function getSrxNewsPostById(postId: string): Promise<SrxNewsPost | null> {
  return withSrxReadFallback("news post detail", null, async () => {
    const post = await prisma2.posts.findUnique({
      where: {
        id: BigInt(postId),
      },
      include: {
        article_categories: true,
        post_tag_links: {
          include: {
            post_tags: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    return mapPost({
      ...post,
      status: post.status as (typeof srxNewsStatusValues)[number],
    });
  });
}

export async function createSrxNewsCategory(input: SrxNewsCategoryMutationInput): Promise<SrxNewsCategory> {
  const payload = parseSrxNewsCategoryInput(input);
  const slug = await ensureUniqueCategorySlug(slugify(payload.slug || payload.name));

  const category = await prisma2.article_categories.create({
    data: {
      name: payload.name,
      slug,
      description: normalizeNullableString(payload.description),
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return mapCategory(category);
}

export async function updateSrxNewsCategory(
  categoryId: string,
  input: SrxNewsCategoryMutationInput,
): Promise<SrxNewsCategory | null> {
  const payload = parseSrxNewsCategoryInput(input);
  const numericId = BigInt(categoryId);
  const existing = await prisma2.article_categories.findUnique({
    where: { id: numericId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const slug = await ensureUniqueCategorySlug(slugify(payload.slug || payload.name), numericId);
  const category = await prisma2.article_categories.update({
    where: {
      id: numericId,
    },
    data: {
      name: payload.name,
      slug,
      description: normalizeNullableString(payload.description),
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return mapCategory(category);
}

export async function deleteSrxNewsCategory(categoryId: string): Promise<void> {
  const numericId = BigInt(categoryId);
  const category = await prisma2.article_categories.findUnique({
    where: { id: numericId },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error("Không tìm thấy danh mục tin tức");
  }

  if (category._count.posts > 0) {
    throw new Error("Danh mục vẫn còn bài viết liên kết, không thể xóa");
  }

  await prisma2.article_categories.delete({
    where: { id: numericId },
  });
}

export async function createSrxNewsTag(input: SrxNewsTagMutationInput): Promise<SrxNewsTag> {
  const payload = parseSrxNewsTagInput(input);
  const slug = await ensureUniqueTagSlug(slugify(payload.slug || payload.name));

  const tag = await prisma2.post_tags.create({
    data: {
      name: payload.name,
      slug,
    },
    include: {
      _count: {
        select: {
          post_tag_links: true,
        },
      },
    },
  });

  return mapTag(tag);
}

export async function updateSrxNewsTag(tagId: string, input: SrxNewsTagMutationInput): Promise<SrxNewsTag | null> {
  const payload = parseSrxNewsTagInput(input);
  const numericId = BigInt(tagId);
  const existing = await prisma2.post_tags.findUnique({
    where: { id: numericId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const slug = await ensureUniqueTagSlug(slugify(payload.slug || payload.name), numericId);
  const tag = await prisma2.post_tags.update({
    where: {
      id: numericId,
    },
    data: {
      name: payload.name,
      slug,
    },
    include: {
      _count: {
        select: {
          post_tag_links: true,
        },
      },
    },
  });

  return mapTag(tag);
}

export async function deleteSrxNewsTag(tagId: string): Promise<void> {
  const numericId = BigInt(tagId);

  await prisma2.$transaction(async (tx) => {
    await tx.post_tag_links.deleteMany({
      where: {
        tag_id: numericId,
      },
    });

    await tx.post_tags.delete({
      where: {
        id: numericId,
      },
    });
  });
}

export async function createSrxNewsPost(input: SrxNewsPostMutationInput): Promise<SrxNewsPost> {
  const payload = parseSrxNewsPostInput(input);
  const slug = await ensureUniquePostSlug(slugify(payload.slug || payload.title));
  const tagIds = [...new Set(payload.tag_ids)].map((tagId) => BigInt(tagId));
  const publishedAt = payload.status === "published" ? (parseOptionalDate(payload.published_at) ?? new Date()) : null;

  const post = await prisma2.posts.create({
    data: {
      category_id: BigInt(payload.category_id),
      title: payload.title,
      slug,
      excerpt: normalizeNullableString(payload.excerpt),
      content: payload.content,
      featured_image_url: normalizeNullableString(payload.featured_image_url),
      status: payload.status,
      is_featured: payload.is_featured,
      published_at: publishedAt,
      post_tag_links: tagIds.length
        ? {
            create: tagIds.map((tagId) => ({
              post_tags: {
                connect: {
                  id: tagId,
                },
              },
            })),
          }
        : undefined,
    },
    include: {
      article_categories: true,
      post_tag_links: {
        include: {
          post_tags: true,
        },
      },
    },
  });

  return mapPost({
    ...post,
    status: post.status as (typeof srxNewsStatusValues)[number],
  });
}

export async function updateSrxNewsPost(postId: string, input: SrxNewsPostMutationInput): Promise<SrxNewsPost | null> {
  const payload = parseSrxNewsPostInput(input);
  const numericId = BigInt(postId);
  const existing = await prisma2.posts.findUnique({
    where: { id: numericId },
    select: { id: true, published_at: true },
  });

  if (!existing) {
    return null;
  }

  const slug = await ensureUniquePostSlug(slugify(payload.slug || payload.title), numericId);
  const tagIds = [...new Set(payload.tag_ids)].map((tagId) => BigInt(tagId));
  const publishedAt =
    payload.status === "published"
      ? (parseOptionalDate(payload.published_at) ?? existing.published_at ?? new Date())
      : null;

  await prisma2.$transaction(async (tx) => {
    await tx.post_tag_links.deleteMany({
      where: {
        post_id: numericId,
      },
    });

    await tx.posts.update({
      where: {
        id: numericId,
      },
      data: {
        category_id: BigInt(payload.category_id),
        title: payload.title,
        slug,
        excerpt: normalizeNullableString(payload.excerpt),
        content: payload.content,
        featured_image_url: normalizeNullableString(payload.featured_image_url),
        status: payload.status,
        is_featured: payload.is_featured,
        published_at: publishedAt,
      },
    });

    if (tagIds.length > 0) {
      await tx.post_tag_links.createMany({
        data: tagIds.map((tagId) => ({
          post_id: numericId,
          tag_id: tagId,
        })),
      });
    }
  });

  return getSrxNewsPostById(postId);
}

export async function deleteSrxNewsPost(postId: string): Promise<void> {
  await prisma2.posts.delete({
    where: {
      id: BigInt(postId),
    },
  });
}
