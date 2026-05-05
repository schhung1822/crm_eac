import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSrxNewsPostById } from "@/lib/srx-news";

const statusLabelMap = {
  archived: "Lưu trữ",
  draft: "Nháp",
  published: "Đang hiển thị",
} as const;

function formatDate(value: Date | null): string {
  return value ? value.toLocaleDateString("vi-VN") : "—";
}

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  if (!/^\d+$/.test(postId)) {
    notFound();
  }

  const post = await getSrxNewsPostById(postId);

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
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
              <BreadcrumbPage>Xem bài viết</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={post.status === "published" ? "default" : post.status === "archived" ? "secondary" : "outline"}
              >
                {statusLabelMap[post.status]}
              </Badge>
              <Badge variant="outline">{post.view_count.toLocaleString("vi-VN")} lượt xem</Badge>
              {post.is_featured ? <Badge variant="outline">Nổi bật</Badge> : null}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
              <p className="text-muted-foreground max-w-3xl text-sm">{post.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/srx/news">
                <ArrowLeft className="size-4" />
                Quay lại danh sách
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/srx/news/${post.id}/edit`}>
                <PencilLine className="size-4" />
                Sửa bài viết
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Nội dung bài viết</CardTitle>
            <CardDescription>{post.excerpt || "Bài viết chưa có mô tả ngắn."}</CardDescription>
          </CardHeader>
          <CardContent>
            <article
              className="[&_a]:text-primary [&_pre]:bg-muted [&_th]:bg-muted/60 max-w-none leading-7 break-words [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_figure]:my-6 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:border [&_img]:shadow-sm [&_li]:mb-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin bài viết</CardTitle>
            <CardDescription>Thông tin quản trị và phân loại của bài viết.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Danh mục</span>
              <span className="font-medium">{post.category_name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Thẻ</span>
              <span>{post.tags.map((tag) => tag.name).join(", ") || "—"}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Xuất bản</span>
              <span>{formatDate(post.published_at)}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Tạo lúc</span>
              <span>{post.created_at.toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Cập nhật</span>
              <span>{post.updated_at.toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Ảnh đại diện</span>
              {post.featured_image_url ? (
                <Link
                  href={post.featured_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary break-all underline-offset-4 hover:underline"
                >
                  {post.featured_image_url}
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
