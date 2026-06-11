import "server-only";

import { prisma } from "@/lib/prisma";
import { prisma2 } from "@/lib/prisma2";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";
import type { SrxNewsPost, SrxNewsPostMutationInput } from "@/lib/srx-news.shared";

type SocialSyncInput = {
  existingFbPostId?: string | null;
  existingZaloPostId?: string | null;
  payload: SrxNewsPostMutationInput;
  post: SrxNewsPost;
};

type SocialSyncResult = {
  facebookPostId: string | null;
  zaloPostId: string | null;
};

type FacebookApiResponse = {
  id?: string;
  post_id?: string;
  error?: {
    message?: string;
  };
};

type ZaloApiResponse = {
  error?: number;
  message?: string;
  data?: {
    articles?: ZaloArticleSummary[];
    id?: string;
    list?: ZaloArticleSummary[];
    medias?: ZaloArticleSummary[];
    post_id?: string;
  };
  id?: string;
  post_id?: string;
};

type ZaloArticleBodyItem =
  | {
      content: string;
      type: "text";
    }
  | {
      caption: string;
      type: "image";
      url: string;
    };

type ZaloArticleSummary = {
  id?: string | number;
  post_id?: string | number;
  title?: string;
};

const HTML_TAG_PATTERN = /<[^>]+>/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const HTML_VIDEO_PATTERN = /<(video|source|iframe)\b|(?:src|href)\s*=\s*(?:"[^"]+\.(?:mp4|mov|m4v|webm)(?:[?#][^"]*)?"|'[^']+\.(?:mp4|mov|m4v|webm)(?:[?#][^']*)?')/i;
const HTML_SPLIT_IMAGE_PATTERN = /<img\b[^>]*>/gi;

function normalizeOptionalString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function hasVideoContent(content: string): boolean {
  return HTML_VIDEO_PATTERN.test(content);
}

function extractImageUrls(post: SrxNewsPost): string[] {
  const imageUrls = new Set<string>();
  const featuredImageUrl = resolveSiteAssetUrl(post.featured_image_url);

  if (featuredImageUrl) {
    imageUrls.add(featuredImageUrl);
  }

  for (const match of post.content.matchAll(HTML_IMAGE_PATTERN)) {
    const imageUrl = resolveSiteAssetUrl(match[1] ?? match[2] ?? match[3] ?? "");

    if (imageUrl) {
      imageUrls.add(imageUrl);
    }
  }

  return [...imageUrls];
}

function buildPublicPostUrl(post: SrxNewsPost): string {
  const template = process.env.SRX_PUBLIC_NEWS_URL_TEMPLATE?.trim();

  if (template) {
    return template
      .replaceAll("{id}", encodeURIComponent(post.id))
      .replaceAll("{slug}", encodeURIComponent(post.slug))
      .replaceAll("{category_slug}", encodeURIComponent(post.category_slug));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(siteUrl);
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname === "/" ? "" : parsedUrl.pathname.replace(/\/+$/, "")}`;
    return `${baseUrl}/tin-tuc/${encodeURIComponent(post.slug)}`;
  } catch {
    return "";
  }
}

function buildPostMessage(post: SrxNewsPost): string {
  return [post.title, normalizeOptionalString(post.excerpt), stripHtml(post.content)].filter(Boolean).join("\n\n").slice(0, 5000);
}

function readHtmlAttribute(tag: string, attributeName: string): string {
  const attributePattern = new RegExp(`\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attributePattern.exec(tag);

  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function splitTextBlocksFromHtml(html: string): string[] {
  const normalizedText = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(HTML_TAG_PATTERN, " ")
    .split(/\n+/)
    .map((line) => decodeHtmlEntities(line).replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean);

  return normalizedText;
}

function buildZaloArticleBody(post: SrxNewsPost, link: string): ZaloArticleBodyItem[] {
  const body: ZaloArticleBodyItem[] = [];
  let cursor = 0;

  for (const match of post.content.matchAll(HTML_SPLIT_IMAGE_PATTERN)) {
    const imageTag = match[0];
    const imageIndex = match.index ?? 0;

    for (const textBlock of splitTextBlocksFromHtml(post.content.slice(cursor, imageIndex))) {
      body.push({
        type: "text",
        content: textBlock,
      });
    }

    const imageUrl = resolveSiteAssetUrl(readHtmlAttribute(imageTag, "src"));

    if (imageUrl) {
      body.push({
        type: "image",
        url: imageUrl,
        caption: readHtmlAttribute(imageTag, "alt") || post.title,
      });
    }

    cursor = imageIndex + imageTag.length;
  }

  for (const textBlock of splitTextBlocksFromHtml(post.content.slice(cursor))) {
    body.push({
      type: "text",
      content: textBlock,
    });
  }

  if (link) {
    body.push({
      type: "text",
      content: `Xem thêm: ${link}`,
    });
  }

  if (body.length === 0) {
    body.push({
      type: "text",
      content: stripHtml(post.content) || post.title,
    });
  }

  return body;
}

async function readZaloAccessToken(): Promise<string> {
  const token = await prisma.token.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      access_token: true,
    },
    where: {
      access_token: {
        not: null,
      },
    },
  });

  const accessToken = token?.access_token?.trim() ?? "";

  if (!accessToken) {
    throw new Error("Chưa có access_token Zalo trong bảng token");
  }

  return accessToken;
}

async function callJsonApi<TResponse>(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<TResponse> {
  const response = await fetch(url, init);
  const result = (await response.json().catch(() => ({}))) as TResponse & {
    error?: { message?: string } | number;
    message?: string;
  };

  if (!response.ok) {
    const apiMessage =
      typeof result.error === "object" && result.error !== null ? result.error.message : result.message;
    throw new Error(apiMessage || fallbackMessage);
  }

  return result;
}

function assertZaloSuccess(result: ZaloApiResponse, fallbackMessage: string): void {
  if (typeof result.error === "number" && result.error !== 0) {
    throw new Error(`Zalo OA: ${result.message || fallbackMessage}`);
  }
}

function getZaloPostId(result: ZaloApiResponse): string {
  return normalizeOptionalString(result.data?.post_id ?? result.data?.id ?? result.post_id ?? result.id);
}

function getZaloEndpoint(kind: "create" | "delete" | "update"): string {
  const envKey =
    kind === "create"
      ? "ZALO_OA_ARTICLE_CREATE_URL"
      : kind === "update"
        ? "ZALO_OA_ARTICLE_UPDATE_URL"
        : "ZALO_OA_ARTICLE_DELETE_URL";

  return (
    process.env[envKey]?.trim() ??
    `https://openapi.zalo.me/v2.0/article/${kind === "delete" ? "remove" : kind}`
  );
}

function getZaloListEndpoint(): string {
  return process.env.ZALO_OA_ARTICLE_LIST_URL?.trim() ?? "https://openapi.zalo.me/v2.0/article/getlist";
}

function buildZaloArticlePayload(post: SrxNewsPost) {
  const imageUrls = extractImageUrls(post);
  const link = buildPublicPostUrl(post);
  const description = normalizeOptionalString(post.excerpt) || stripHtml(post.content).slice(0, 250);

  return {
    type: "normal",
    title: post.title,
    author: process.env.ZALO_OA_ARTICLE_AUTHOR?.trim() || "SRX",
    cover: imageUrls[0]
      ? {
          cover_type: "photo",
          photo_url: imageUrls[0],
          status: "show",
        }
      : undefined,
    description,
    body: buildZaloArticleBody(post, link),
  };
}

function normalizeTitleForMatch(value: string | null | undefined): string {
  return normalizeOptionalString(value).replace(/\s+/g, " ").toLowerCase();
}

function extractZaloArticleList(result: ZaloApiResponse): ZaloArticleSummary[] {
  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (Array.isArray(result.data?.articles)) {
    return result.data.articles;
  }

  if (Array.isArray(result.data?.medias)) {
    return result.data.medias;
  }

  if (Array.isArray(result.data?.list)) {
    return result.data.list;
  }

  return [];
}

function getZaloArticleId(article: ZaloArticleSummary): string {
  return normalizeOptionalString(article.post_id?.toString() ?? article.id?.toString());
}

async function tryFindZaloArticleIdByTitle(title: string): Promise<string | null> {
  const accessToken = await readZaloAccessToken();
  const listUrl = new URL(getZaloListEndpoint());
  listUrl.searchParams.set("offset", "0");
  listUrl.searchParams.set("count", "50");

  let result: ZaloApiResponse;

  try {
    result = await callJsonApi<ZaloApiResponse>(
      listUrl.toString(),
      {
        method: "GET",
        headers: {
          access_token: accessToken,
        },
      },
      "Không thể lấy danh sách bài viết Zalo OA",
    );
  } catch (error) {
    return null;
  }

  try {
    assertZaloSuccess(result, "Không thể lấy danh sách bài viết Zalo OA");
  } catch {
    return null;
  }

  const matchedArticle = extractZaloArticleList(result).find((article) => {
    return normalizeTitleForMatch(article.title) === normalizeTitleForMatch(title);
  });
  const postId = matchedArticle ? getZaloArticleId(matchedArticle) : "";

  return postId || null;
}

async function createZaloArticle(post: SrxNewsPost): Promise<string | null> {
  const accessToken = await readZaloAccessToken();
  let result: ZaloApiResponse;

  try {
    result = await callJsonApi<ZaloApiResponse>(
      getZaloEndpoint("create"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: accessToken,
        },
        body: JSON.stringify(buildZaloArticlePayload(post)),
      },
      "Không thể đăng bài viết lên Zalo OA",
    );
  } catch (error) {
    throw new Error(`Zalo OA create: ${error instanceof Error ? error.message : "Không thể đăng bài viết"}`);
  }

  assertZaloSuccess(result, "Không thể đăng bài viết lên Zalo OA");

  return getZaloPostId(result) || (await tryFindZaloArticleIdByTitle(post.title));
}

async function updateZaloArticle(post: SrxNewsPost, zaloPostId: string): Promise<string | null> {
  const accessToken = await readZaloAccessToken();
  let result: ZaloApiResponse;

  try {
    result = await callJsonApi<ZaloApiResponse>(
      getZaloEndpoint("update"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: accessToken,
        },
        body: JSON.stringify({
          id: zaloPostId,
          post_id: zaloPostId,
          ...buildZaloArticlePayload(post),
        }),
      },
      "Không thể cập nhật bài viết Zalo OA",
    );
  } catch (error) {
    throw new Error(`Zalo OA update: ${error instanceof Error ? error.message : "Không thể cập nhật bài viết"}`);
  }

  assertZaloSuccess(result, "Không thể cập nhật bài viết Zalo OA");

  return getZaloPostId(result) || (await tryFindZaloArticleIdByTitle(post.title)) || zaloPostId;
}

async function deleteZaloArticle(zaloPostId: string): Promise<void> {
  const accessToken = await readZaloAccessToken();
  let result: ZaloApiResponse;

  try {
    result = await callJsonApi<ZaloApiResponse>(
      getZaloEndpoint("delete"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: accessToken,
        },
        body: JSON.stringify({
          id: zaloPostId,
          post_id: zaloPostId,
        }),
      },
      "Không thể xóa bài viết Zalo OA",
    );
  } catch (error) {
    throw new Error(`Zalo OA: ${error instanceof Error ? error.message : "Không thể xóa bài viết"}`);
  }

  assertZaloSuccess(result, "Không thể xóa bài viết Zalo OA");
}

function getFacebookGraphBaseUrl(): string {
  const graphVersion = process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || "v20.0";
  return `https://graph.facebook.com/${graphVersion}`;
}

function getFacebookPageConfig(): { pageId: string; pageToken: string } {
  const pageId = process.env.SRX_FACEBOOK_PAGE_ID?.trim() || "1149491654916679";
  const pageToken = process.env.SRX_FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? "";

  if (!pageToken) {
    throw new Error("Chưa cấu hình SRX_FACEBOOK_PAGE_ACCESS_TOKEN");
  }

  return { pageId, pageToken };
}

async function callFacebookFormApi(endpoint: string, params: Record<string, string>): Promise<FacebookApiResponse> {
  const { pageToken } = getFacebookPageConfig();
  const body = new URLSearchParams({
    ...params,
    access_token: pageToken,
  });

  let result: FacebookApiResponse;

  try {
    result = await callJsonApi<FacebookApiResponse>(
      endpoint,
      {
        method: "POST",
        body,
      },
      "Không thể gọi Facebook Graph API",
    );
  } catch (error) {
    throw new Error(`Facebook: ${error instanceof Error ? error.message : "Không thể gọi Graph API"}`);
  }

  if (result.error) {
    throw new Error(`Facebook: ${result.error.message || "Graph API trả về lỗi"}`);
  }

  return result;
}

async function createFacebookPost(post: SrxNewsPost): Promise<string> {
  const { pageId } = getFacebookPageConfig();
  const graphBaseUrl = getFacebookGraphBaseUrl();
  const imageUrls = extractImageUrls(post);
  const link = buildPublicPostUrl(post);
  const message = buildPostMessage(post);
  const attachedMedia: Array<{ media_fbid: string }> = [];

  for (const imageUrl of imageUrls) {
    const photoResult = await callFacebookFormApi(`${graphBaseUrl}/${pageId}/photos`, {
      url: imageUrl,
      published: "false",
    });
    const mediaId = normalizeOptionalString(photoResult.id);

    if (mediaId) {
      attachedMedia.push({ media_fbid: mediaId });
    }
  }

  const feedResult = await callFacebookFormApi(`${graphBaseUrl}/${pageId}/feed`, {
    message,
    ...(link ? { link } : {}),
    ...(attachedMedia.length ? { attached_media: JSON.stringify(attachedMedia) } : {}),
  });
  const postId = normalizeOptionalString(feedResult.id ?? feedResult.post_id);

  if (!postId) {
    throw new Error("Facebook không trả về post_id");
  }

  return postId;
}

async function deleteFacebookPost(facebookPostId: string): Promise<void> {
  const { pageToken } = getFacebookPageConfig();
  const body = new URLSearchParams({
    access_token: pageToken,
  });
  let result: FacebookApiResponse;

  try {
    result = await callJsonApi<FacebookApiResponse>(
      `${getFacebookGraphBaseUrl()}/${encodeURIComponent(facebookPostId)}`,
      {
        method: "DELETE",
        body,
      },
      "Không thể xóa bài viết Facebook",
    );
  } catch (error) {
    throw new Error(`Facebook: ${error instanceof Error ? error.message : "Không thể xóa bài viết"}`);
  }

  if (result.error) {
    throw new Error(`Facebook: ${result.error.message || "Không thể xóa bài viết"}`);
  }
}

async function updatePostSocialIds(postId: string, socialIds: SocialSyncResult): Promise<void> {
  await prisma2.$executeRaw`
    UPDATE posts
    SET id_zalo_post = ${socialIds.zaloPostId}, id_fb_post = ${socialIds.facebookPostId}
    WHERE id = ${BigInt(postId)}
  `;
}

export async function syncSrxNewsPostSocialChannels({
  existingFbPostId,
  existingZaloPostId,
  payload,
  post,
}: SocialSyncInput): Promise<SocialSyncResult> {
  const wantsFacebook = payload.publish_to_facebook === true;
  const wantsZalo = payload.publish_to_zalo === true;

  if ((wantsFacebook || wantsZalo) && hasVideoContent(post.content)) {
    throw new Error("Bài viết có video nên không thể đăng lên Facebook/Zalo OA");
  }

  let facebookPostId = normalizeOptionalString(existingFbPostId) || null;
  let zaloPostId = normalizeOptionalString(existingZaloPostId) || null;

  if (wantsFacebook) {
    if (facebookPostId) {
      await deleteFacebookPost(facebookPostId);
    }

    facebookPostId = await createFacebookPost(post);
  } else if (facebookPostId) {
    await deleteFacebookPost(facebookPostId);
    facebookPostId = null;
  }

  await updatePostSocialIds(post.id, { facebookPostId, zaloPostId });

  if (wantsZalo) {
    zaloPostId = zaloPostId ? await updateZaloArticle(post, zaloPostId) : await createZaloArticle(post);
  } else if (zaloPostId) {
    await deleteZaloArticle(zaloPostId);
    zaloPostId = null;
  }

  await updatePostSocialIds(post.id, { facebookPostId, zaloPostId });

  return {
    facebookPostId,
    zaloPostId,
  };
}
