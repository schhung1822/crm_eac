import "server-only";

import { prisma } from "@/lib/prisma";
import { prisma2 } from "@/lib/prisma2";
import { resolveSiteAssetUrl } from "@/lib/site-asset-url";
import type { SrxNewsPost, SrxNewsPostMutationInput } from "@/lib/srx-news.shared";

type SocialSyncInput = {
  existingFbPostId?: string | null;
  existingZaloPostId?: string | null;
  mode?: "replace" | "create-missing";
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
      comment?: "show";
      status?: "show";
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
const FACEBOOK_MESSAGE_LIMIT = 5000;
const FACEBOOK_BOLD_UPPERCASE_START = 0x1d400;
const FACEBOOK_BOLD_LOWERCASE_START = 0x1d41a;
const FACEBOOK_BOLD_DIGIT_START = 0x1d7ce;

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
    .replace(/&#39;/gi, "'")
    .replace(/&#x([\da-f]+);/gi, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 10)));
}

function normalizeFacebookMessage(value: string): string {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendFacebookBlockBreak(parts: string[]): void {
  const current = parts.join("");

  if (!current.trim()) {
    return;
  }

  if (current.endsWith("\n\n")) {
    return;
  }

  if (current.endsWith("\n")) {
    parts.push("\n");
    return;
  }

  parts.push("\n\n");
}

function appendFacebookLineBreak(parts: string[]): void {
  const current = parts.join("");

  if (!current.trim() || current.endsWith("\n")) {
    return;
  }

  parts.push("\n");
}

function appendFacebookText(parts: string[], value: string): void {
  const normalizedValue = value.replace(/\s+/g, " ");

  if (!normalizedValue.trim()) {
    return;
  }

  const current = parts.join("");
  const needsLeadingSpace =
    current.length > 0 && !/[\s([{/"']$/.test(current) && !/^[\s.,;:!?%)]/.test(normalizedValue);

  parts.push(`${needsLeadingSpace ? " " : ""}${normalizedValue.trim()}`);
}

function parseHtmlTagName(tag: string): string {
  const match = /^<\/?\s*([a-z\d]+)/i.exec(tag);
  return match ? match[1].toLowerCase() : "";
}

function isClosingHtmlTag(tag: string): boolean {
  return /^<\s*\//.test(tag);
}

function tokenizeHtml(html: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);

    if (tagStart === -1) {
      tokens.push(html.slice(cursor));
      break;
    }

    if (tagStart > cursor) {
      tokens.push(html.slice(cursor, tagStart));
    }

    const tagEnd = html.indexOf(">", tagStart + 1);

    if (tagEnd === -1) {
      tokens.push(html.slice(tagStart));
      break;
    }

    tokens.push(html.slice(tagStart, tagEnd + 1));
    cursor = tagEnd + 1;
  }

  return tokens;
}

function toFacebookBoldCharacter(character: string): string {
  const codePoint = character.codePointAt(0) ?? 0;

  if (codePoint >= 65 && codePoint <= 90) {
    return String.fromCodePoint(FACEBOOK_BOLD_UPPERCASE_START + codePoint - 65);
  }

  if (codePoint >= 97 && codePoint <= 122) {
    return String.fromCodePoint(FACEBOOK_BOLD_LOWERCASE_START + codePoint - 97);
  }

  if (codePoint >= 48 && codePoint <= 57) {
    return String.fromCodePoint(FACEBOOK_BOLD_DIGIT_START + codePoint - 48);
  }

  if (character === "Đ") {
    return `${String.fromCodePoint(FACEBOOK_BOLD_UPPERCASE_START + 3)}\u0335`;
  }

  if (character === "đ") {
    return `${String.fromCodePoint(FACEBOOK_BOLD_LOWERCASE_START + 3)}\u0335`;
  }

  return character;
}

function toFacebookBold(value: string): string {
  return [...value.normalize("NFD")].map(toFacebookBoldCharacter).join("").normalize("NFC");
}

function handleFacebookListTag(parts: string[], isClosingTag: boolean): void {
  if (isClosingTag) {
    appendFacebookLineBreak(parts);
    return;
  }

  appendFacebookLineBreak(parts);
  appendFacebookText(parts, "- ");
}

function handleFacebookBlockTag(parts: string[], tagName: string, isClosingTag: boolean): void {
  appendFacebookBlockBreak(parts);

  if (!isClosingTag && tagName === "blockquote") {
    appendFacebookText(parts, "> ");
  }
}

function handleFacebookHtmlTag(parts: string[], tag: string, boldDepth: number): number {
  const tagName = parseHtmlTagName(tag);
  const isClosingTag = isClosingHtmlTag(tag);

  if (["strong", "b"].includes(tagName)) {
    return Math.max(0, boldDepth + (isClosingTag ? -1 : 1));
  }

  if (/^h[1-6]$/.test(tagName)) {
    appendFacebookBlockBreak(parts);
    return Math.max(0, boldDepth + (isClosingTag ? -1 : 1));
  }

  if (tagName === "br") {
    appendFacebookLineBreak(parts);
  } else if (["p", "div", "section", "article", "figure", "figcaption", "blockquote"].includes(tagName)) {
    handleFacebookBlockTag(parts, tagName, isClosingTag);
  } else if (["ul", "ol"].includes(tagName)) {
    appendFacebookBlockBreak(parts);
  } else if (tagName === "li") {
    handleFacebookListTag(parts, isClosingTag);
  }

  return boldDepth;
}

function formatHtmlForFacebookMessage(html: string): string {
  const parts: string[] = [];
  let boldDepth = 0;
  const safeHtml = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");

  for (const token of tokenizeHtml(safeHtml)) {
    if (token.startsWith("<")) {
      boldDepth = handleFacebookHtmlTag(parts, token, boldDepth);
    } else {
      const text = decodeHtmlEntities(token);
      appendFacebookText(parts, boldDepth > 0 ? toFacebookBold(text) : text);
    }
  }

  return normalizeFacebookMessage(parts.join(""));
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

function normalizePublicHttpUrl(value: string): string {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? parsedUrl.toString() : "";
  } catch {
    return "";
  }
}

function getSocialImageUrls(post: SrxNewsPost): string[] {
  return extractImageUrls(post).map(normalizePublicHttpUrl).filter(Boolean);
}

function appendLinkToMessage(message: string, link: string): string {
  if (!link) {
    return message;
  }

  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return link;
  }

  if (normalizedMessage.includes(link)) {
    return normalizedMessage;
  }

  return `${normalizedMessage}\n\nXem thêm: ${link}`;
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
  return [
    toFacebookBold(post.title),
    normalizeOptionalString(post.excerpt),
    formatHtmlForFacebookMessage(post.content),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, FACEBOOK_MESSAGE_LIMIT);
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
        status: "show",
        comment: "show",
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
  const imageUrls = getSocialImageUrls(post);
  const link = buildPublicPostUrl(post);
  const description = normalizeOptionalString(post.excerpt) || stripHtml(post.content).slice(0, 250);

  return {
    type: "normal",
    status: "show",
    comment: "show",
    title: post.title,
    author: process.env.ZALO_OA_ARTICLE_AUTHOR?.trim() || "SRX",
    cover: imageUrls[0]
      ? {
          cover_type: "photo",
          photo_url: imageUrls[0],
          status: "show",
          comment: "show",
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
  const imageUrls = getSocialImageUrls(post);
  const link = buildPublicPostUrl(post);
  const message = appendLinkToMessage(buildPostMessage(post), link);
  const attachedMedia: Array<{ media_fbid: string }> = [];

  if (imageUrls.length === 1) {
    const photoResult = await callFacebookFormApi(`${graphBaseUrl}/${pageId}/photos`, {
      url: imageUrls[0],
      caption: message,
      published: "true",
    });
    const photoPostId = normalizeOptionalString(photoResult.post_id ?? photoResult.id);

    if (!photoPostId) {
      throw new Error("Facebook không trả về post_id cho bài viết ảnh");
    }

    return photoPostId;
  }

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
    ...(attachedMedia.length ? { attached_media: JSON.stringify(attachedMedia) } : link ? { link } : {}),
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
  mode = "replace",
  payload,
  post,
}: SocialSyncInput): Promise<SocialSyncResult> {
  const canPublishSocial = payload.status === "published";
  const wantsFacebook = canPublishSocial && payload.publish_to_facebook === true;
  const wantsZalo = canPublishSocial && payload.publish_to_zalo === true;

  if ((wantsFacebook || wantsZalo) && hasVideoContent(post.content)) {
    throw new Error("Bài viết có video nên không thể đăng lên Facebook/Zalo OA");
  }

  let facebookPostId = normalizeOptionalString(existingFbPostId) || null;
  let zaloPostId = normalizeOptionalString(existingZaloPostId) || null;
  const shouldReplaceExisting = mode === "replace";

  if (wantsFacebook) {
    if (facebookPostId && shouldReplaceExisting) {
      await deleteFacebookPost(facebookPostId);
      facebookPostId = null;
    }

    if (!facebookPostId) {
      facebookPostId = await createFacebookPost(post);
    }
  } else if (facebookPostId) {
    await deleteFacebookPost(facebookPostId);
    facebookPostId = null;
  }

  await updatePostSocialIds(post.id, { facebookPostId, zaloPostId });

  if (wantsZalo) {
    if (zaloPostId && shouldReplaceExisting) {
      zaloPostId = await updateZaloArticle(post, zaloPostId);
    } else if (!zaloPostId) {
      zaloPostId = await createZaloArticle(post);
    }
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
