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
import { getSrxProductById } from "@/lib/srx-products";

const statusLabelMap = {
  active: "Đang hiển thị",
  archived: "Lưu trữ",
  draft: "Nháp",
  inactive: "Tạm ẩn",
} as const;

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value)} đ`;
}

function formatDate(value: Date | null): string {
  return value ? value.toLocaleDateString("vi-VN") : "—";
}

// eslint-disable-next-line complexity
export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  if (!/^\d+$/.test(productId)) {
    notFound();
  }

  const product = await getSrxProductById(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/srx/products">Sản phẩm</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Xem sản phẩm</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  product.status === "active" ? "default" : product.status === "archived" ? "secondary" : "outline"
                }
              >
                {statusLabelMap[product.status]}
              </Badge>
              <Badge variant="outline">{product.view_count.toLocaleString("vi-VN")} lượt xem</Badge>
              <Badge variant="outline">{product.sold_count.toLocaleString("vi-VN")} đã bán</Badge>
              {product.is_featured ? <Badge variant="outline">Nổi bật</Badge> : null}
              {product.has_variants ? <Badge variant="outline">Có biến thể</Badge> : null}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              <p className="text-muted-foreground max-w-3xl text-sm">
                {product.product_code} · {product.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/srx/products">
                <ArrowLeft className="size-4" />
                Quay lại danh sách
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/srx/products/${product.id}/edit`}>
                <PencilLine className="size-4" />
                Sửa sản phẩm
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Mô tả sản phẩm</CardTitle>
            <CardDescription>{product.short_description || "Sản phẩm chưa có mô tả ngắn."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            {product.thumbnail_url ? (
              <section className="grid gap-3">
                <h2 className="text-lg font-semibold">Ảnh đại diện</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.thumbnail_url}
                  alt={product.name}
                  className="max-h-[420px] w-full rounded-lg border object-cover"
                />
              </section>
            ) : null}

            {product.gallery_images.length > 0 ? (
              <section className="grid gap-3">
                <h2 className="text-lg font-semibold">Album ảnh</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {product.gallery_images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.image_url}
                        alt={image.alt_text || product.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">Mô tả chi tiết</h2>
              {product.description ? (
                <article
                  className="[&_a]:text-primary [&_pre]:bg-muted [&_th]:bg-muted/60 max-w-none leading-7 break-words [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_figure]:my-6 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:border [&_img]:shadow-sm [&_li]:mb-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <div className="text-muted-foreground text-sm">Chưa có mô tả chi tiết.</div>
              )}
            </section>

            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">Hướng dẫn sử dụng</h2>
              <div className="text-sm leading-7 whitespace-pre-wrap">
                {product.usage_instructions || "Chưa có hướng dẫn sử dụng."}
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">Thành phần</h2>
              <div className="text-sm leading-7 whitespace-pre-wrap">
                {product.ingredient_list || "Chưa có thông tin thành phần."}
              </div>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin sản phẩm</CardTitle>
            <CardDescription>Thông tin quản trị, giá bán và phân loại của sản phẩm.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Danh mục</span>
              <span className="font-medium">{product.category_name || "—"}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Thương hiệu</span>
              <span>{product.brand_name || "—"}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Thẻ</span>
              <span>{product.tags.map((tag) => tag.name).join(", ") || "—"}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Giá gốc</span>
              <span>{formatCurrency(product.base_price)}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Giá khuyến mãi</span>
              <span>{formatCurrency(product.sale_price)}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Đánh giá</span>
              <span>
                {product.rating_average.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} / 5 ·{" "}
                {product.rating_count.toLocaleString("vi-VN")} lượt
              </span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Xuất bản</span>
              <span>{formatDate(product.published_at)}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Tạo lúc</span>
              <span>{product.created_at.toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Cập nhật</span>
              <span>{product.updated_at.toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase">Ảnh đại diện</span>
              {product.thumbnail_url ? (
                <Link
                  href={product.thumbnail_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary break-all underline-offset-4 hover:underline"
                >
                  {product.thumbnail_url}
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
