/* eslint-disable complexity, max-lines -- form editor gồm nhiều nhánh hiển thị theo trạng thái bài, tách nhỏ sẽ rối hơn. */
"use client";

import * as React from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, FileText, Gauge, Globe2, ImageIcon, Loader2, Save, Settings2, Tags } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  srxNewsStatusValues,
  type SrxNewsCategory,
  type SrxNewsPost,
  type SrxNewsPostMutationInput,
  type SrxNewsTag,
} from "@/lib/srx-news.shared";

import { AiWriteDialog, type AiWriteRequest } from "./ai-write-dialog";
import { ArticleScorePanel, type ArticleScore } from "./article-score-panel";
import type { CkeditorContentEditorProps } from "./ckeditor-content-editor";
import { NewsFeaturedImageField } from "./news-featured-image-field";
import { PostPreviewDialog, type NewsPreviewPost } from "./post-preview-dialog";

type PostFormState = SrxNewsPostMutationInput;

const emptyFormState: PostFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image_url: "",
  category_id: "",
  tag_ids: [],
  status: "draft",
  is_featured: false,
  published_at: "",
  publish_to_facebook: false,
  publish_to_zalo: false,
};

const editorLayoutClassName = "grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]";

const CkeditorContentEditor = dynamic<CkeditorContentEditorProps>(
  () => import("./ckeditor-content-editor").then((module_) => module_.CkeditorContentEditor),
  {
    loading: () => (
      <div className="text-muted-foreground bg-muted/40 flex min-h-[640px] items-center justify-center rounded-lg border border-dashed text-sm">
        Đang tải trình soạn thảo nội dung...
      </div>
    ),
    ssr: false,
  },
);

function toLocalDateTimeInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatLocalDateTimeLabel(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getSocialPublishTimingLabel(form: PostFormState): string {
  const wantsSocialPublish = form.publish_to_facebook || form.publish_to_zalo;

  if (!wantsSocialPublish) {
    return "Chọn nền tảng muốn đăng thêm bài viết lên.";
  }

  if (form.status !== "published") {
    return "Chỉ tự đăng khi trạng thái để là đang hiển thị.";
  }

  if (!form.published_at) {
    return "Không chọn ngày xuất bản: bài sẽ được đăng lên nền tảng bạn chọn ngay sau khi lưu.";
  }

  const publishDate = new Date(form.published_at);

  if (Number.isNaN(publishDate.getTime()) || publishDate.getTime() <= Date.now()) {
    return "Ngày xuất bản không ở tương lai: bài sẽ đăng lên nền tảng bạn chọn ngay khi lưu.";
  }

  return `Đã đặt hẹn: bài sẽ được đăng lên lúc ${formatLocalDateTimeLabel(form.published_at)}.`;
}

function getStatusLabel(status: PostFormState["status"]): string {
  switch (status) {
    case "draft":
      return "Nháp";
    case "published":
      return "Đang hiển thị";
    case "archived":
      return "Lưu trữ";
    default:
      return status;
  }
}

function isRichTextContentEmpty(value: string): boolean {
  const normalizedValue = value
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .trim();

  return normalizedValue.length === 0;
}

function buildFormState(post: SrxNewsPost | null, categories: SrxNewsCategory[]): PostFormState {
  if (!post) {
    return {
      ...emptyFormState,
      category_id: categories[0]?.id ?? "",
    };
  }

  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    featured_image_url: post.featured_image_url,
    category_id: post.category_id,
    tag_ids: post.tag_ids,
    status: post.status,
    is_featured: post.is_featured,
    published_at: toLocalDateTimeInput(post.published_at),
    publish_to_facebook: post.social_publish_facebook || Boolean(post.id_fb_post),
    publish_to_zalo: post.social_publish_zalo || Boolean(post.id_zalo_post),
  };
}

export function PostEditorForm({
  initialValue,
  categories,
  tags,
}: {
  initialValue: SrxNewsPost | null;
  categories: SrxNewsCategory[];
  tags: SrxNewsTag[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<PostFormState>(() => buildFormState(initialValue, categories));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [score, setScore] = React.useState<ArticleScore | null>(null);
  const [isScoring, setIsScoring] = React.useState(false);
  // Từ khoá mục tiêu chỉ phục vụ chấm điểm và viết bài, không lưu vào bảng posts.
  const [targetKeyword, setTargetKeyword] = React.useState("");
  const [isWriting, setIsWriting] = React.useState(false);

  const handleWriteWithAi = React.useCallback(
    async (request: AiWriteRequest) => {
      const isImproving = request.improve && !isRichTextContentEmpty(form.content);

      if (!isImproving && !targetKeyword.trim() && !form.title.trim()) {
        toast.error("Nhập tiêu đề hoặc từ khoá mục tiêu để AI biết viết về gì");
        return false;
      }

      try {
        setIsWriting(true);

        const response = await fetch("/api/srx/news/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "write-article",
            input: {
              title: form.title,
              targetKeyword: targetKeyword.trim(),
              brief: request.brief || form.excerpt,
              audience: request.audience,
              tone: request.tone,
              categoryName: categories.find((item) => item.id === form.category_id)?.name ?? "",
              provider: request.provider,
              model: request.model,
              currentContent: isImproving ? form.content : "",
              improvements: isImproving ? (score?.suggestions ?? []) : [],
            },
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message ?? "Không viết được bài");
        }

        const article = payload.article as {
          title: string;
          metaDescription: string;
          slug: string;
          html: string;
          targetKeyword: string;
          report: ArticleScore;
        };

        setForm((current) => ({
          ...current,
          title: article.title || current.title,
          excerpt: article.metaDescription || current.excerpt,
          slug: article.slug || current.slug,
          content: article.html,
        }));

        if (article.targetKeyword) {
          setTargetKeyword(article.targetKeyword);
        }

        setScore(article.report);
        toast.success(isImproving ? "AI đã tối ưu xong và chấm điểm lại" : "AI đã viết xong và chấm điểm bài");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không viết được bài");
        return false;
      } finally {
        setIsWriting(false);
      }
    },
    [categories, form.category_id, form.content, form.excerpt, form.title, score?.suggestions, targetKeyword],
  );

  const handleScore = React.useCallback(async () => {
    if (isRichTextContentEmpty(form.content)) {
      toast.error("Cần có nội dung bài viết trước khi chấm điểm");
      return;
    }

    try {
      setIsScoring(true);

      const response = await fetch("/api/srx/news/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          input: {
            title: form.title,
            content: form.content,
            excerpt: form.excerpt,
            keywords: targetKeyword.trim() || form.slug.replaceAll("-", " ").trim(),
          },
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Không chấm được điểm");
      }

      setScore(payload.score as ArticleScore);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không chấm được điểm");
    } finally {
      setIsScoring(false);
    }
  }, [form.content, form.excerpt, form.slug, form.title, targetKeyword]);

  const isEditing = initialValue !== null;
  const socialPublishTimingLabel = getSocialPublishTimingLabel(form);
  const submitLabel = isSubmitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo bài viết";
  const previewPost = React.useMemo<NewsPreviewPost>(() => {
    const selectedCategory = categories.find((category) => category.id === form.category_id);
    const selectedTags = tags
      .filter((tag) => form.tag_ids.includes(tag.id))
      .map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug }));

    return {
      category_name: selectedCategory?.name ?? "Follow SRX",
      category_slug: selectedCategory?.slug ?? "follow-srx",
      content: form.content,
      excerpt: form.excerpt,
      featured_image_url: form.featured_image_url,
      published_at: form.published_at || null,
      slug: form.slug,
      tags: selectedTags,
      title: form.title || "Tiêu đề bài viết",
    };
  }, [categories, form, tags]);

  const handleTagChange = (tagId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      tag_ids: checked ? [...current.tag_ids, tagId] : current.tag_ids.filter((item) => item !== tagId),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isRichTextContentEmpty(form.content)) {
      toast.error("Vui lòng nhập nội dung bài viết");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(initialValue ? `/api/srx/news/posts/${initialValue.id}` : "/api/srx/news/posts", {
        method: initialValue ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu bài viết");
      }

      toast.success(isEditing ? "Đã cập nhật bài viết" : "Đã tạo bài viết mới");
      router.push("/srx/news");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu bài viết");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
      {/* Thanh thao tác dính trên đầu: luôn thấy tiêu đề bài và nút lưu khi cuộn dài. */}
      <div className="bg-background/85 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 -mx-2 rounded-b-xl border-b px-2 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/srx/news" aria-label="Quay lại danh sách">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <span className="bg-primary/10 text-primary hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {form.title.trim() || (isEditing ? "Sửa bài viết" : "Bài viết mới")}
              </h1>
              <p className="text-muted-foreground truncate text-xs">
                {isEditing ? "Đang sửa" : "Đang soạn"}
                {form.slug ? ` · /${form.slug}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{getStatusLabel(form.status)}</Badge>
            <AiWriteDialog
              hasContent={!isRichTextContentEmpty(form.content)}
              isWriting={isWriting}
              onWrite={handleWriteWithAi}
            />
            <Button type="submit" form="news-post-form" disabled={isSubmitting || !categories.length}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isEditing ? "Lưu thay đổi" : "Tạo bài viết"}
            </Button>
          </div>
        </div>
      </div>

      {!categories.length ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
          Bạn cần tạo ít nhất một danh mục tin tức trước khi lưu bài viết.
        </div>
      ) : null}

      <form id="news-post-form" className={editorLayoutClassName} onSubmit={handleSubmit}>
        <div className="grid min-w-0 gap-5">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/10 border-b px-4 py-0 md:px-5">
              <CardTitle className="flex items-center gap-2 text-base">Nội dung chính</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 px-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="news-title">Tiêu đề</Label>
                <Input
                  id="news-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Nhập tiêu đề bài viết"
                  className="h-11 text-base font-medium"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-target-keyword">Từ khoá mục tiêu</Label>
                <Input
                  id="news-target-keyword"
                  value={targetKeyword}
                  onChange={(event) => setTargetKeyword(event.target.value)}
                  placeholder="VD: serum vitamin C cho da nhạy cảm"
                />
                <p className="text-muted-foreground text-xs">
                  Dùng cho chấm điểm và viết bài bằng AI. Không lưu vào bài, để trống thì suy từ đường dẫn.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-excerpt">Mô tả ngắn</Label>
                <Textarea
                  id="news-excerpt"
                  className="min-h-28 resize-y"
                  value={form.excerpt}
                  onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                  placeholder="Tóm tắt ngắn cho bài viết"
                />
              </div>

              <div className="grid gap-2">
                <Label>Nội dung</Label>
                <CkeditorContentEditor
                  disabled={isSubmitting}
                  value={form.content}
                  onChange={(value) => setForm((current) => ({ ...current, content: value }))}
                  placeholder="Nhập nội dung bài viết"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-5">
          {/* Điểm số nằm ngay đầu cột phải, tách hẳn khỏi panel trợ lý AI. */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/10 border-b px-4 py-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="size-4" />
                Điểm SEO / AEO / GEO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ArticleScorePanel score={score} isScoring={isScoring} onRescore={() => void handleScore()} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/10 border-b px-4 py-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="size-4" />
                Thiết lập
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 p-4">
              <div className="grid gap-2">
                <Label htmlFor="news-slug">Slug</Label>
                <Input
                  id="news-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Để trống để tự sinh"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-category">Danh mục</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}
                >
                  <SelectTrigger id="news-category" className="w-full">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-status">Trạng thái</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as PostFormState["status"] }))
                  }
                >
                  <SelectTrigger id="news-status" className="w-full">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {srxNewsStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-published-at">Ngày xuất bản</Label>
                <Input
                  id="news-published-at"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))}
                />
              </div>

              <div className="bg-muted/20 rounded-lg border p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="size-4" />
                  Ảnh đại diện
                </div>
                <NewsFeaturedImageField
                  disabled={isSubmitting}
                  value={form.featured_image_url}
                  aiContext={{ title: form.title, excerpt: form.excerpt, content: form.content }}
                  onChange={(value) => setForm((current) => ({ ...current, featured_image_url: value }))}
                />
              </div>

              <label className="bg-muted/20 hover:bg-muted/40 flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 transition-colors">
                <Checkbox
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_featured: checked === true }))}
                />
                <span className="text-sm">Đánh dấu bài viết nổi bật</span>
              </label>

              <div className="bg-muted/20 grid gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe2 className="size-4" />
                  <Label>Đăng lên nền tảng khác</Label>
                </div>

                <label className="hover:bg-background flex min-h-10 items-center gap-3 rounded-md px-2 transition-colors">
                  <Checkbox
                    checked={form.publish_to_facebook}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, publish_to_facebook: checked === true }))
                    }
                  />
                  <span className="text-sm">Fanpage Facebook</span>
                </label>

                <label className="hover:bg-background flex min-h-10 items-center gap-3 rounded-md px-2 transition-colors">
                  <Checkbox
                    checked={form.publish_to_zalo}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, publish_to_zalo: checked === true }))
                    }
                  />
                  <span className="text-sm">Zalo OA</span>
                </label>

                <p className="text-muted-foreground px-2 text-xs leading-5">{socialPublishTimingLabel}</p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-2">
                    <Tags className="size-4" />
                    Thẻ tin tức
                  </Label>
                  <span className="text-muted-foreground text-xs">{form.tag_ids.length} thẻ được chọn</span>
                </div>

                <div className="nice-scroll bg-muted/10 grid max-h-[220px] gap-1.5 overflow-y-auto rounded-lg border p-2 md:grid-cols-2 xl:grid-cols-1">
                  {tags.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      Chưa có thẻ nào. Hãy tạo thẻ trước khi gắn cho bài viết.
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="hover:bg-background flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
                      >
                        <Checkbox
                          checked={form.tag_ids.includes(tag.id)}
                          onCheckedChange={(checked) => handleTagChange(tag.id, checked === true)}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/10 flex-col-reverse gap-2 border-t p-3 sm:flex-row sm:justify-end">
              <PostPreviewDialog post={previewPost} />
              <Button type="button" variant="outline" onClick={() => router.push("/srx/news")} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || categories.length === 0}>
                <Save className="size-4" />
                {submitLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
