/* eslint-disable max-lines */
"use client";

import * as React from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

import type { CkeditorContentEditorProps } from "./ckeditor-content-editor";
import { NewsFeaturedImageField } from "./news-featured-image-field";

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
};

const editorLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 7fr) minmax(0, 3fr)",
  gap: "1.5rem",
  alignItems: "start",
} as const;

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

  const isEditing = initialValue !== null;
  const submitLabel = isSubmitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo bài viết";

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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/srx/news">Tin tức</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isEditing ? "Sửa bài viết" : "Thêm bài viết"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Sửa bài viết" : "Thêm bài viết"}</h1>
            <p className="text-muted-foreground max-w-3xl">
              Quản lý tiêu đề, nội dung, danh mục, thẻ và trạng thái hiển thị của bài viết trên website SRX.
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/srx/news">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>

      {!categories.length ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
          Bạn cần tạo ít nhất một danh mục tin tức trước khi lưu bài viết.
        </div>
      ) : null}

      <form id="news-post-form" className="grid gap-6" style={editorLayoutStyle} onSubmit={handleSubmit}>
        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Nội dung chính</CardTitle>
              <CardDescription>Gồm tiêu đề, mô tả ngắn và phần nội dung chính của bài viết.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="news-title">Tiêu đề</Label>
                <Input
                  id="news-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Nhập tiêu đề bài viết"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="news-excerpt">Mô tả ngắn</Label>
                <Textarea
                  id="news-excerpt"
                  className="min-h-32"
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

        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Thiết lập bài viết</CardTitle>
              <CardDescription>Gồm các trường còn lại và nhóm thao tác lưu / hủy.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-5">
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

              <NewsFeaturedImageField
                disabled={isSubmitting}
                value={form.featured_image_url}
                onChange={(value) => setForm((current) => ({ ...current, featured_image_url: value }))}
              />

              <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
                <Checkbox
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_featured: checked === true }))}
                />
                <span className="text-sm">Đánh dấu bài viết nổi bật</span>
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Thẻ tin tức</Label>
                  <span className="text-muted-foreground text-xs">{form.tag_ids.length} thẻ được chọn</span>
                </div>

                <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-md border p-4 md:grid-cols-2 lg:grid-cols-1">
                  {tags.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      Chưa có thẻ nào. Hãy tạo thẻ trước khi gắn cho bài viết.
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-3 rounded-md px-1 py-1">
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

            <CardFooter className="justify-end gap-3 border-t">
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
