/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { Eye, Facebook, Globe2, MessageCircle, MessageSquare, Send, Share, ThumbsUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SrxNewsPost } from "@/lib/srx-news.shared";
import { cn } from "@/lib/utils";

export type NewsPreviewPost = Omit<
  Pick<
    SrxNewsPost,
    | "category_name"
    | "category_slug"
    | "content"
    | "excerpt"
    | "featured_image_url"
    | "published_at"
    | "slug"
    | "tags"
    | "title"
  >,
  "published_at"
> & {
  published_at: Date | string | null;
};

const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const HTML_IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const URL_ORIGIN = "https://srx.vn";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function stripHtml(value: string): string {
  return normalizeText(
    decodeHtmlEntities(
      value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi, "\n")
        .replace(HTML_TAG_PATTERN, " "),
    ),
  );
}

function formatDate(value: Date | string | null): string {
  if (!value) {
    return "Chưa xuất bản";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa xuất bản";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeImageUrl(value: string): string {
  const trimmedValue = decodeHtmlEntities(value).trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    return new URL(trimmedValue, URL_ORIGIN).toString();
  } catch {
    return trimmedValue;
  }
}

function getPostImages(post: NewsPreviewPost): string[] {
  const urls = new Set<string>();
  const featuredImageUrl = normalizeImageUrl(post.featured_image_url);

  if (featuredImageUrl) {
    urls.add(featuredImageUrl);
  }

  for (const match of post.content.matchAll(HTML_IMAGE_PATTERN)) {
    const imageUrl = normalizeImageUrl(match[1] ?? match[2] ?? match[3] ?? "");

    if (imageUrl) {
      urls.add(imageUrl);
    }
  }

  return [...urls];
}

type ZaloPreviewBlock =
  | {
      text: string;
      type: "text";
    }
  | {
      alt: string;
      type: "image";
      url: string;
    };

function readHtmlAttribute(tag: string, attributeName: string): string {
  const attributePattern = new RegExp(`\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attributePattern.exec(tag);

  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function splitTextBlocksFromHtml(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(HTML_TAG_PATTERN, " ")
    .split(/\n+/)
    .map((line) => normalizeText(decodeHtmlEntities(line)))
    .filter(Boolean);
}

function getZaloPreviewBlocks(post: NewsPreviewPost): ZaloPreviewBlock[] {
  const blocks: ZaloPreviewBlock[] = [];
  let cursor = 0;

  for (const match of post.content.matchAll(HTML_IMAGE_TAG_PATTERN)) {
    const imageTag = match[0];
    const imageIndex = match.index ?? 0;

    for (const textBlock of splitTextBlocksFromHtml(post.content.slice(cursor, imageIndex))) {
      blocks.push({ type: "text", text: textBlock });
    }

    const imageUrl = normalizeImageUrl(readHtmlAttribute(imageTag, "src"));

    if (imageUrl) {
      blocks.push({ type: "image", url: imageUrl, alt: readHtmlAttribute(imageTag, "alt") || post.title });
    }

    cursor = imageIndex + imageTag.length;
  }

  for (const textBlock of splitTextBlocksFromHtml(post.content.slice(cursor))) {
    blocks.push({ type: "text", text: textBlock });
  }

  return blocks;
}

function buildPublicPostUrl(post: NewsPreviewPost): string {
  const categorySlug = post.category_slug || "follow-srx";
  const slug = post.slug || "duong-dan-bai-viet";

  return `https://srx.vn/${categorySlug}/${slug}`;
}

function getDescription(post: NewsPreviewPost): string {
  return post.excerpt || stripHtml(post.content).slice(0, 220) || "Mô tả ngắn của bài viết sẽ hiển thị tại đây.";
}

function getBodyText(post: NewsPreviewPost): string {
  return stripHtml(post.content) || getDescription(post);
}

function PlatformFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="max-h-[72vh] overflow-y-auto rounded-lg border bg-[#f6f7f8] p-4 sm:p-6">
      <div className={cn("mx-auto", className)}>{children}</div>
    </div>
  );
}

function ImageMosaic({ images, title }: { images: string[]; title: string }) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return <img src={images[0]} alt={title} className="max-h-[560px] w-full object-cover" />;
  }

  const visibleImages = images.slice(0, 4);
  const remainingCount = images.length - visibleImages.length;

  return (
    <div className="grid grid-cols-2 gap-1 bg-white">
      {visibleImages.map((imageUrl, index) => (
        <div key={imageUrl} className="relative aspect-square overflow-hidden bg-[#eef0f2]">
          <img src={imageUrl} alt={`${title} ${index + 1}`} className="size-full object-cover" />
          {remainingCount > 0 && index === visibleImages.length - 1 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-semibold text-white">
              +{remainingCount}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function WebPreview({ post }: { post: NewsPreviewPost }) {
  const publicUrl = buildPublicPostUrl(post);

  return (
    <PlatformFrame className="max-w-[940px] bg-white text-neutral-950 shadow-sm ring-1 ring-black/5">
      <article className="px-5 py-8 sm:px-10 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-[#7a633e] uppercase">
          <span>{post.category_name || "Follow SRX"}</span>
          <span className="text-neutral-300">/</span>
          <span>{formatDate(post.published_at)}</span>
        </div>

        <h1 className="max-w-4xl text-3xl leading-tight font-semibold text-[#171717] sm:text-[36px]">{post.title}</h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-600 sm:text-[16px]">{getDescription(post)}</p>

        {post.tags.length ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-[#eef1ed] px-3 py-1 text-xs text-[#173f35]">
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="mt-8 aspect-[16/9] w-full rounded-[12px] object-cover"
          />
        ) : (
          <div className="mt-8 flex aspect-[16/9] w-full items-center justify-center bg-[#eef1ed] text-sm text-neutral-500">
            Ảnh đại diện bài viết
          </div>
        )}

        <div
          className="mt-8 max-w-none leading-8 text-neutral-800 [&_a]:text-[#1b6654] [&_blockquote]:border-l-2 [&_blockquote]:border-[#b69b68] [&_blockquote]:pl-4 [&_figure]:my-6 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-6 [&_img]:w-full [&_li]:mb-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_strong]:font-semibold [&_table]:my-6 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: post.content || "<p>Nội dung bài viết sẽ hiển thị tại đây.</p>" }}
        />

        <div className="mt-8 rounded-md bg-neutral-50 p-3 text-xs break-all text-neutral-500">{publicUrl}</div>
      </article>
    </PlatformFrame>
  );
}

function FacebookPreview({ post }: { post: NewsPreviewPost }) {
  const images = getPostImages(post);
  const body = [post.title, getDescription(post), getBodyText(post), `Xem thêm: ${buildPublicPostUrl(post)}`]
    .filter(Boolean)
    .join("\n\n");

  return (
    <PlatformFrame className="max-w-[540px] rounded-lg bg-[#edf0f5] p-3">
      <div className="overflow-hidden rounded-lg bg-white text-[#050505] shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#123f34] text-sm font-bold text-white">
            SRX
          </div>
          <div className="min-w-0">
            <div className="font-semibold">SRX Việt Nam</div>
            <div className="text-xs text-[#65676b]">Vừa xong · Công khai</div>
          </div>
        </div>

        <div className="px-4 py-3 text-[15px] leading-5 whitespace-pre-line">{body}</div>

        <ImageMosaic images={images} title={post.title} />

        <div className="border-t px-4 py-2">
          <div className="grid grid-cols-3 text-sm font-semibold text-[#65676b]">
            <button className="flex h-9 items-center justify-center gap-2 rounded-md hover:bg-[#f2f2f2]" type="button">
              <ThumbsUp className="size-4" />
              Thích
            </button>
            <button className="flex h-9 items-center justify-center gap-2 rounded-md hover:bg-[#f2f2f2]" type="button">
              <MessageSquare className="size-4" />
              Bình luận
            </button>
            <button className="flex h-9 items-center justify-center gap-2 rounded-md hover:bg-[#f2f2f2]" type="button">
              <Share className="size-4" />
              Chia sẻ
            </button>
          </div>
        </div>
      </div>
    </PlatformFrame>
  );
}

function ZaloPreview({ post }: { post: NewsPreviewPost }) {
  const images = getPostImages(post);
  const contentBlocks = getZaloPreviewBlocks(post);
  const coverImageUrl = normalizeImageUrl(post.featured_image_url) || images[0];

  return (
    <PlatformFrame className="max-w-[430px] rounded-[28px] bg-[#dfefff] p-4 shadow-inner">
      <div className="overflow-hidden rounded-[24px] border bg-white text-[#081b2b] shadow-sm ring-1 ring-black/5">
        <div className="bg-[#0068ff] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#0068ff]">
              SRX
            </div>
            <div>
              <div className="font-semibold">SRX Việt Nam</div>
              <div className="text-xs text-white/80">Official Account</div>
            </div>
          </div>
        </div>

        {coverImageUrl ? (
          <img src={coverImageUrl} alt={post.title} className="aspect-[16/9] w-full object-cover" />
        ) : null}

        <div className="grid gap-4 p-4">
          <h2 className="text-xl leading-7 font-semibold">{post.title}</h2>
          <p className="text-sm leading-6 text-[#52606d]">{getDescription(post)}</p>

          <div className="space-y-3 border-t pt-3 text-sm leading-6 text-[#1f2933]">
            {contentBlocks.length === 0 ? (
              <p>{getBodyText(post) || "Nội dung bài viết sẽ hiển thị tại đây."}</p>
            ) : (
              contentBlocks.map((block, index) =>
                block.type === "image" ? (
                  <img
                    key={`${block.url}-${index}`}
                    src={block.url}
                    alt={block.alt}
                    className="w-full rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <p key={`${block.text}-${index}`}>{block.text}</p>
                ),
              )
            )}
          </div>

          <Button className="mt-1 bg-[#0068ff] hover:bg-[#0055d6]" type="button">
            <Send className="size-4" />
            Xem thêm
          </Button>
        </div>
      </div>
    </PlatformFrame>
  );
}
export function PostPreviewDialog({ post, trigger }: { post: NewsPreviewPost; trigger?: React.ReactNode }) {
  const imageCount = getPostImages(post).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline">
            <Eye className="size-4" />
            Xem trước
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] gap-5 overflow-hidden p-0 sm:max-w-[1180px]">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <DialogTitle>Xem trước bài đăng</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="web" className="min-h-0 px-6 pb-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-fit">
            <TabsTrigger value="web">
              <Globe2 className="size-4" />
              Web
            </TabsTrigger>
            <TabsTrigger value="facebook">
              <Facebook className="size-4" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="zalo">
              <MessageCircle className="size-4" />
              Zalo OA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="web">
            <WebPreview post={post} />
          </TabsContent>
          <TabsContent value="facebook">
            <FacebookPreview post={post} />
          </TabsContent>
          <TabsContent value="zalo">
            <ZaloPreview post={post} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
