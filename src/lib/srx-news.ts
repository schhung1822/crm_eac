/* eslint-disable max-lines, no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { withSrxReadFallback } from "@/lib/srx-db-errors";
import { getSrxDB } from "@/lib/srx-db";
import { prisma2 } from "@/lib/prisma2";
import { syncSrxNewsPostSocialChannels } from "@/lib/srx-news-social-posting";
import { Prisma } from "../../prisma/generated/srx-app-client";
import {
  resolveHtmlAssetUrls,
  resolveHtmlAssetUrlsForStorage,
  resolveNullableSiteAssetUrlForStorage,
  resolveSiteAssetUrl,
} from "@/lib/site-asset-url";
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

const LOCAL_DATE_TIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const VIETNAM_TIME_OFFSET = "+07:00";

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

  const normalizedDateInput = LOCAL_DATE_TIME_INPUT_PATTERN.test(trimmed) ? `${trimmed}${VIETNAM_TIME_OFFSET}` : trimmed;
  const date = new Date(normalizedDateInput);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày giờ không hợp lệ");
  }

  return date;
}

type ColumnRow = RowDataPacket & {
  Field: string;
};

let ensurePostSocialScheduleColumnsPromise: Promise<void> | null = null;

function isFutureDate(value: Date | null): boolean {
  return value ? value.getTime() > Date.now() : false;
}

function shouldSyncSocialOnSave(
  payload: SrxNewsPostMutationInput,
  publishedAt: Date | null,
  existingSocialIds?: PostSocialIds,
): boolean {
  const hasExistingSocialPost = Boolean(existingSocialIds?.id_fb_post || existingSocialIds?.id_zalo_post);

  if (payload.status !== "published") {
    return hasExistingSocialPost;
  }

  if (!isFutureDate(publishedAt)) {
    return payload.publish_to_facebook || payload.publish_to_zalo || hasExistingSocialPost;
  }

  return (
    (!payload.publish_to_facebook && Boolean(existingSocialIds?.id_fb_post)) ||
    (!payload.publish_to_zalo && Boolean(existingSocialIds?.id_zalo_post))
  );
}

async function ensurePostSocialScheduleColumns(): Promise<void> {
  if (!ensurePostSocialScheduleColumnsPromise) {
    ensurePostSocialScheduleColumnsPromise = (async () => {
      const db = getSrxDB();
      const [rows] = await db.query<ColumnRow[]>("SHOW COLUMNS FROM posts WHERE Field IN (?, ?)", [
        "social_publish_facebook",
        "social_publish_zalo",
      ]);
      const existingColumns = new Set(rows.map((row) => row.Field));

      if (!existingColumns.has("social_publish_facebook")) {
        await db.execute("ALTER TABLE posts ADD COLUMN social_publish_facebook TINYINT(1) NOT NULL DEFAULT 0 AFTER id_fb_post");
      }

      if (!existingColumns.has("social_publish_zalo")) {
        await db.execute("ALTER TABLE posts ADD COLUMN social_publish_zalo TINYINT(1) NOT NULL DEFAULT 0 AFTER social_publish_facebook");
      }
    })().catch((error: unknown) => {
      ensurePostSocialScheduleColumnsPromise = null;
      throw error;
    });
  }

  await ensurePostSocialScheduleColumnsPromise;
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
  id_zalo_post?: string | null;
  id_fb_post?: string | null;
  social_publish_facebook?: boolean | number | null;
  social_publish_zalo?: boolean | number | null;
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
    id_zalo_post: normalizeOptionalString(post.id_zalo_post),
    id_fb_post: normalizeOptionalString(post.id_fb_post),
    social_publish_facebook: Boolean(post.social_publish_facebook),
    social_publish_zalo: Boolean(post.social_publish_zalo),
    title: post.title,
    slug: post.slug,
    excerpt: normalizeOptionalString(post.excerpt),
    content: resolveHtmlAssetUrls(post.content),
    featured_image_url: resolveSiteAssetUrl(post.featured_image_url),
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

type PostSocialIds = {
  id: bigint;
  id_fb_post: string | null;
  id_zalo_post: string | null;
  social_publish_facebook: boolean | number | null;
  social_publish_zalo: boolean | number | null;
};

type DueSocialPostRow = RowDataPacket & PostSocialIds;

export type SrxNewsSocialSchedulerResult = {
  checked: number;
  failed: Array<{ error: string; postId: string; title?: string }>;
  published: Array<{ facebookPostId: string | null; postId: string; title: string; zaloPostId: string | null }>;
};

export type SrxNewsSocialSchedulerStatus = {
  appNow: string;
  duePosts: Array<{
    facebookPostId: string | null;
    id: string;
    publishFacebook: boolean;
    publishZalo: boolean;
    publishedAt: string | null;
    title: string;
    zaloPostId: string | null;
  }>;
  dueTotal: number;
  scheduledTotal: number;
};

async function updatePostSocialScheduleFlags(
  postId: string | bigint,
  payload: Pick<SrxNewsPostMutationInput, "publish_to_facebook" | "publish_to_zalo">,
): Promise<void> {
  await ensurePostSocialScheduleColumns();
  await prisma2.$executeRaw`
    UPDATE posts
    SET social_publish_facebook = ${payload.publish_to_facebook ? 1 : 0},
        social_publish_zalo = ${payload.publish_to_zalo ? 1 : 0}
    WHERE id = ${BigInt(postId)}
  `;
}

async function getPostSocialIds(postId: bigint): Promise<PostSocialIds> {
  await ensurePostSocialScheduleColumns();
  const rows = await prisma2.$queryRaw<PostSocialIds[]>`
    SELECT id, id_fb_post, id_zalo_post, social_publish_facebook, social_publish_zalo
    FROM posts
    WHERE id = ${postId}
    LIMIT 1
  `;

  return rows[0] ?? {
    id: postId,
    id_fb_post: null,
    id_zalo_post: null,
    social_publish_facebook: false,
    social_publish_zalo: false,
  };
}

async function getPostSocialIdMap(postIds: readonly bigint[]): Promise<Map<string, PostSocialIds>> {
  if (postIds.length === 0) {
    return new Map();
  }

  await ensurePostSocialScheduleColumns();
  const rows = await prisma2.$queryRaw<PostSocialIds[]>`
    SELECT id, id_fb_post, id_zalo_post, social_publish_facebook, social_publish_zalo
    FROM posts
    WHERE id IN (${Prisma.join(postIds)})
  `;

  return new Map(rows.map((row) => [row.id.toString(), row]));
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

    const socialIdMap = await getPostSocialIdMap(posts.map((post) => post.id));

    return posts.map((post) => {
      const socialIds = socialIdMap.get(post.id.toString());

      return mapPost({
        ...post,
        ...socialIds,
        status: post.status as (typeof srxNewsStatusValues)[number],
      });
    });
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

    const socialIds = await getPostSocialIds(post.id);

    return mapPost({
      ...post,
      ...socialIds,
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
  const normalizedContent = resolveHtmlAssetUrlsForStorage(payload.content);
  const featuredImageUrl = resolveNullableSiteAssetUrlForStorage(payload.featured_image_url);

  const post = await prisma2.posts.create({
    data: {
      category_id: BigInt(payload.category_id),
      title: payload.title,
      slug,
      excerpt: normalizeNullableString(payload.excerpt),
      content: normalizedContent,
      featured_image_url: featuredImageUrl,
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
  await updatePostSocialScheduleFlags(post.id, payload);

  const mappedPost = mapPost({
    ...post,
    social_publish_facebook: payload.publish_to_facebook,
    social_publish_zalo: payload.publish_to_zalo,
    status: post.status as (typeof srxNewsStatusValues)[number],
  });

  if (shouldSyncSocialOnSave(payload, publishedAt)) {
    await syncSrxNewsPostSocialChannels({
      payload,
      post: mappedPost,
    });

    return (await getSrxNewsPostById(mappedPost.id)) ?? mappedPost;
  }

  return mappedPost;
}

export async function updateSrxNewsPost(postId: string, input: SrxNewsPostMutationInput): Promise<SrxNewsPost | null> {
  const payload = parseSrxNewsPostInput(input);
  const numericId = BigInt(postId);
  const normalizedContent = resolveHtmlAssetUrlsForStorage(payload.content);
  const featuredImageUrl = resolveNullableSiteAssetUrlForStorage(payload.featured_image_url);
  const existing = await prisma2.posts.findUnique({
    where: { id: numericId },
    select: { id: true, published_at: true },
  });

  if (!existing) {
    return null;
  }

  const existingSocialIds = await getPostSocialIds(numericId);
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
        content: normalizedContent,
        featured_image_url: featuredImageUrl,
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
  await updatePostSocialScheduleFlags(numericId, payload);

  const post = await getSrxNewsPostById(postId);

  if (!post) {
    return null;
  }

  if (shouldSyncSocialOnSave(payload, publishedAt, existingSocialIds)) {
    await syncSrxNewsPostSocialChannels({
      existingFbPostId: existingSocialIds.id_fb_post,
      existingZaloPostId: existingSocialIds.id_zalo_post,
      payload,
      post,
    });
  }

  return getSrxNewsPostById(postId);
}

export async function publishDueSrxNewsSocialPosts(limit = 20): Promise<SrxNewsSocialSchedulerResult> {
  await ensurePostSocialScheduleColumns();

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const dueRows = await prisma2.$queryRaw<DueSocialPostRow[]>`
    SELECT id, id_fb_post, id_zalo_post, social_publish_facebook, social_publish_zalo
    FROM posts
    WHERE status = 'published'
      AND published_at IS NOT NULL
      AND published_at <= ${new Date()}
      AND (
        (social_publish_facebook = 1 AND (id_fb_post IS NULL OR id_fb_post = ''))
        OR (social_publish_zalo = 1 AND (id_zalo_post IS NULL OR id_zalo_post = ''))
      )
    ORDER BY published_at ASC, id ASC
    LIMIT ${safeLimit}
  `;

  const result: SrxNewsSocialSchedulerResult = {
    checked: dueRows.length,
    failed: [],
    published: [],
  };

  for (const row of dueRows) {
    const postId = row.id.toString();
    const post = await getSrxNewsPostById(postId);

    if (!post) {
      result.failed.push({ postId, error: "Khong tim thay bai viet" });
      continue;
    }

    const payload: SrxNewsPostMutationInput = {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image_url: post.featured_image_url,
      category_id: post.category_id,
      tag_ids: post.tag_ids,
      status: post.status,
      is_featured: post.is_featured,
      published_at: post.published_at?.toISOString() ?? "",
      publish_to_facebook: Boolean(row.social_publish_facebook),
      publish_to_zalo: Boolean(row.social_publish_zalo),
    };

    try {
      const syncResult = await syncSrxNewsPostSocialChannels({
        existingFbPostId: row.id_fb_post,
        existingZaloPostId: row.id_zalo_post,
        mode: "create-missing",
        payload,
        post,
      });

      result.published.push({
        postId,
        title: post.title,
        facebookPostId: syncResult.facebookPostId,
        zaloPostId: syncResult.zaloPostId,
      });
    } catch (error) {
      result.failed.push({
        postId,
        title: post.title,
        error: error instanceof Error ? error.message : "Khong the dang bai viet",
      });
    }
  }

  return result;
}

export async function getSrxNewsSocialSchedulerStatus(limit = 20): Promise<SrxNewsSocialSchedulerStatus> {
  await ensurePostSocialScheduleColumns();

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const appNow = new Date();
  const [scheduledRows, dueRows] = await Promise.all([
    prisma2.$queryRaw<Array<RowDataPacket & { total: bigint | number }>>`
      SELECT COUNT(*) AS total
      FROM posts
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND (
          (social_publish_facebook = 1 AND (id_fb_post IS NULL OR id_fb_post = ''))
          OR (social_publish_zalo = 1 AND (id_zalo_post IS NULL OR id_zalo_post = ''))
        )
    `,
    prisma2.$queryRaw<
      Array<
        RowDataPacket & {
          id: bigint;
          id_fb_post: string | null;
          id_zalo_post: string | null;
          published_at: Date | null;
          social_publish_facebook: boolean | number | null;
          social_publish_zalo: boolean | number | null;
          title: string;
        }
      >
    >`
      SELECT id, title, published_at, id_fb_post, id_zalo_post, social_publish_facebook, social_publish_zalo
      FROM posts
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= ${appNow}
        AND (
          (social_publish_facebook = 1 AND (id_fb_post IS NULL OR id_fb_post = ''))
          OR (social_publish_zalo = 1 AND (id_zalo_post IS NULL OR id_zalo_post = ''))
        )
      ORDER BY published_at ASC, id ASC
      LIMIT ${safeLimit}
    `,
  ]);

  return {
    appNow: appNow.toISOString(),
    scheduledTotal: Number(scheduledRows[0]?.total ?? 0),
    dueTotal: dueRows.length,
    duePosts: dueRows.map((row) => ({
      id: row.id.toString(),
      title: row.title,
      publishedAt: row.published_at?.toISOString() ?? null,
      publishFacebook: Boolean(row.social_publish_facebook),
      publishZalo: Boolean(row.social_publish_zalo),
      facebookPostId: normalizeOptionalString(row.id_fb_post) || null,
      zaloPostId: normalizeOptionalString(row.id_zalo_post) || null,
    })),
  };
}

export async function deleteSrxNewsPost(postId: string): Promise<void> {
  const numericId = BigInt(postId);
  const [post, socialIds] = await Promise.all([getSrxNewsPostById(postId), getPostSocialIds(numericId)]);

  if (post && (socialIds.id_fb_post || socialIds.id_zalo_post)) {
    await syncSrxNewsPostSocialChannels({
      existingFbPostId: socialIds.id_fb_post,
      existingZaloPostId: socialIds.id_zalo_post,
      payload: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featured_image_url: post.featured_image_url,
        category_id: post.category_id,
        tag_ids: post.tag_ids,
        status: post.status,
        is_featured: post.is_featured,
        published_at: post.published_at?.toISOString() ?? "",
        publish_to_facebook: false,
        publish_to_zalo: false,
      },
      post,
    });
  }

  await prisma2.posts.delete({
    where: {
      id: numericId,
    },
  });
}
