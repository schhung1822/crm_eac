/* eslint-disable max-lines */
"use client";

import * as React from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Package2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { CkeditorContentEditorProps } from "@/components/ckeditor/ckeditor-content-editor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  srxProductStatusValues,
  type SrxProduct,
  type SrxProductBrand,
  type SrxProductCategory,
  type SrxProductMutationInput,
  type SrxProductTag,
  type SrxProductVariantMutationInput,
  srxProductVariantStatusValues,
} from "@/lib/srx-products.shared";

import { ProductMediaFields } from "./product-media-fields";

type ProductFormState = SrxProductMutationInput;
type ProductVariantFormState = SrxProductVariantMutationInput;

function createEmptyVariantState(index: number, productCode = "", basePrice = "0", salePrice = "", imageUrl = ""): ProductVariantFormState {
  const normalizedProductCode = productCode.trim().toUpperCase() || "SP";
  return {
    id: "",
    sku: `${normalizedProductCode}-VAR-${index}`,
    barcode: "",
    variant_name: "",
    price: basePrice,
    sale_price: salePrice,
    stock_quantity: "0",
    low_stock_threshold: "0",
    weight_grams: "",
    image_url: imageUrl,
    is_default: index === 1,
    status: "active",
  };
}

const emptyFormState: ProductFormState = {
  name: "",
  slug: "",
  product_code: "",
  short_description: "",
  description: "",
  usage_instructions: "",
  ingredient_list: "",
  category_id: "",
  brand_id: "",
  tag_ids: [],
  status: "draft",
  has_variants: false,
  is_featured: false,
  base_price: "0",
  sale_price: "",
  thumbnail_url: "",
  info_img: "",
  gallery_image_urls: [],
  variants: [],
  published_at: "",
};

const editorLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 7fr) minmax(0, 3fr)",
  gap: "1.5rem",
  alignItems: "start",
} as const;

const editorCardStyle = { height: "100%" } as const;
const editorContentStyle = { flex: "1 1 auto" } as const;
const editorFooterStyle = { marginTop: "auto" } as const;

const CkeditorContentEditor = dynamic<CkeditorContentEditorProps>(
  () => import("@/components/ckeditor/ckeditor-content-editor").then((module_) => module_.CkeditorContentEditor),
  {
    loading: () => (
      <div className="text-muted-foreground bg-muted/40 flex min-h-[640px] items-center justify-center rounded-lg border border-dashed text-sm">
        Đang tải trình soạn thảo mô tả sản phẩm...
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

function getStatusLabel(status: ProductFormState["status"]): string {
  switch (status) {
    case "draft":
      return "Nháp";
    case "active":
      return "Đang hiển thị";
    case "inactive":
      return "Tạm ẩn";
    case "archived":
      return "Lưu trữ";
    default:
      return status;
  }
}

function getApiErrorMessage(result: unknown, fallbackMessage: string): string {
  if (!result || typeof result !== "object") {
    return fallbackMessage;
  }

  const message = "message" in result && typeof result.message === "string" ? result.message : "";

  if ("issues" in result && Array.isArray(result.issues) && result.issues.length > 0) {
    const issueSummary = result.issues
      .map((issue) => {
        if (!issue || typeof issue !== "object" || !("message" in issue) || typeof issue.message !== "string") {
          return "";
        }

        const fieldPath =
          "path" in issue && Array.isArray(issue.path) && issue.path.length > 0
            ? issue.path.map((segment: unknown) => String(segment)).join(".")
            : "";

        return fieldPath ? `${fieldPath}: ${issue.message}` : issue.message;
      })
      .filter(Boolean)
      .join("\n");

    if (issueSummary) {
      return message ? `${message}\n${issueSummary}` : issueSummary;
    }
  }

  return message || fallbackMessage;
}

function buildFormState(product: SrxProduct | null): ProductFormState {
  if (!product) {
    return emptyFormState;
  }

  return {
    name: product.name,
    slug: product.slug,
    product_code: product.product_code,
    short_description: product.short_description,
    description: product.description,
    usage_instructions: product.usage_instructions,
    ingredient_list: product.ingredient_list,
    category_id: product.category_id,
    brand_id: product.brand_id,
    tag_ids: product.tag_ids,
    status: product.status,
    has_variants: product.has_variants,
    is_featured: product.is_featured,
    base_price: String(product.base_price),
    sale_price: product.sale_price === null ? "" : String(product.sale_price),
    thumbnail_url: product.thumbnail_url,
    info_img: product.info_img,
    gallery_image_urls: product.gallery_images.map((image) => image.image_url),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      variant_name: variant.variant_name,
      price: String(variant.price),
      sale_price: variant.sale_price === null ? "" : String(variant.sale_price),
      stock_quantity: String(variant.stock_quantity),
      low_stock_threshold: String(variant.low_stock_threshold),
      weight_grams: variant.weight_grams === null ? "" : String(variant.weight_grams),
      image_url: variant.image_url,
      is_default: variant.is_default,
      status: variant.status,
    })),
    published_at: toLocalDateTimeInput(product.published_at),
  };
}

export function ProductEditorForm({
  initialValue,
  brands,
  categories,
  tags,
}: {
  initialValue: SrxProduct | null;
  brands: SrxProductBrand[];
  categories: SrxProductCategory[];
  tags: SrxProductTag[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<ProductFormState>(() => buildFormState(initialValue));
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = initialValue !== null;
  const submitLabel = isSubmitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo sản phẩm";

  const handleTagChange = (tagId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      tag_ids: checked ? [...current.tag_ids, tagId] : current.tag_ids.filter((item) => item !== tagId),
    }));
  };

  const handleVariantChange = (
    index: number,
    patch:
      | Partial<ProductVariantFormState>
      | ((currentVariant: ProductVariantFormState) => Partial<ProductVariantFormState>),
  ) => {
    setForm((current) => {
      const nextVariants = [...current.variants];
      const currentVariant = nextVariants[index];

      if (!currentVariant) {
        return current;
      }

      const nextPatch = typeof patch === "function" ? patch(currentVariant) : patch;
      nextVariants[index] = { ...currentVariant, ...nextPatch };

      if (nextPatch.is_default === true) {
        for (let cursor = 0; cursor < nextVariants.length; cursor += 1) {
          nextVariants[cursor] = {
            ...nextVariants[cursor],
            is_default: cursor === index,
          };
        }
      }

      return {
        ...current,
        variants: nextVariants,
      };
    });
  };

  const handleAddVariant = () => {
    setForm((current) => {
      const nextIndex = current.variants.length + 1;
      const nextVariant = createEmptyVariantState(
        nextIndex,
        current.product_code,
        current.base_price,
        current.sale_price,
        current.thumbnail_url,
      );

      return {
        ...current,
        has_variants: true,
        variants:
          current.variants.length === 0
            ? [{ ...nextVariant, is_default: true }]
            : [...current.variants, { ...nextVariant, is_default: false }],
      };
    });
  };

  const handleRemoveVariant = (index: number) => {
    setForm((current) => {
      const nextVariants = current.variants.filter((_, currentIndex) => currentIndex !== index);

      if (nextVariants.length > 0 && !nextVariants.some((variant) => variant.is_default)) {
        nextVariants[0] = { ...nextVariants[0], is_default: true };
      }

      return {
        ...current,
        variants: nextVariants,
      };
    });
  };

  const variantConfigurationSection = form.has_variants ? (
    <div className="grid gap-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label className="flex items-center gap-2">
            <Package2 className="size-4" />
            Cấu hình biến thể
          </Label>
          <p className="text-muted-foreground text-xs leading-5">
            Mỗi biến thể có SKU, giá và tồn kho riêng. Website bán hàng sẽ dùng dữ liệu này để hiển thị lựa chọn.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleAddVariant} className="gap-2">
          <Plus className="size-4" />
          Thêm biến thể
        </Button>
      </div>

      {form.variants.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
          Chưa có biến thể nào. Hãy thêm ít nhất một biến thể để cấu hình SKU, giá và tồn kho.
        </div>
      ) : (
        <div className="grid gap-4">
          {form.variants.map((variant, index) => (
            <div key={variant.id || `variant-${index}`} className="rounded-lg border bg-background p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">Biến thể {index + 1}</div>
                  <div className="text-muted-foreground text-xs">
                    {variant.variant_name || variant.sku || "Chưa đặt tên biến thể"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVariant(index)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Xóa
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`variant-name-${index}`}>Tên biến thể</Label>
                  <Input
                    id={`variant-name-${index}`}
                    value={variant.variant_name}
                    onChange={(event) => handleVariantChange(index, { variant_name: event.target.value })}
                    placeholder="VD: 30ml / Da dầu"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                  <Input
                    id={`variant-sku-${index}`}
                    value={variant.sku}
                    onChange={(event) => handleVariantChange(index, { sku: event.target.value.toUpperCase() })}
                    placeholder="VD: SRX-001-VAR-1"
                    required={form.has_variants}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-barcode-${index}`}>Barcode</Label>
                  <Input
                    id={`variant-barcode-${index}`}
                    value={variant.barcode}
                    onChange={(event) => handleVariantChange(index, { barcode: event.target.value })}
                    placeholder="Mã vạch"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-image-${index}`}>Ảnh biến thể</Label>
                  <Input
                    id={`variant-image-${index}`}
                    value={variant.image_url}
                    onChange={(event) => handleVariantChange(index, { image_url: event.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-price-${index}`}>Giá gốc</Label>
                  <Input
                    id={`variant-price-${index}`}
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(event) => handleVariantChange(index, { price: event.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-sale-price-${index}`}>Giá khuyến mãi</Label>
                  <Input
                    id={`variant-sale-price-${index}`}
                    inputMode="decimal"
                    value={variant.sale_price}
                    onChange={(event) => handleVariantChange(index, { sale_price: event.target.value })}
                    placeholder="Để trống nếu không giảm giá"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-stock-${index}`}>Tồn kho</Label>
                  <Input
                    id={`variant-stock-${index}`}
                    inputMode="numeric"
                    value={variant.stock_quantity}
                    onChange={(event) => handleVariantChange(index, { stock_quantity: event.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-low-stock-${index}`}>Ngưỡng cảnh báo</Label>
                  <Input
                    id={`variant-low-stock-${index}`}
                    inputMode="numeric"
                    value={variant.low_stock_threshold}
                    onChange={(event) => handleVariantChange(index, { low_stock_threshold: event.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-weight-${index}`}>Khối lượng (gram)</Label>
                  <Input
                    id={`variant-weight-${index}`}
                    inputMode="decimal"
                    value={variant.weight_grams}
                    onChange={(event) => handleVariantChange(index, { weight_grams: event.target.value })}
                    placeholder="VD: 30"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`variant-status-${index}`}>Trạng thái biến thể</Label>
                  <Select
                    value={variant.status}
                    onValueChange={(value: ProductVariantFormState["status"]) => handleVariantChange(index, { status: value })}
                  >
                    <SelectTrigger id={`variant-status-${index}`}>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxProductVariantStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status === "active" ? "Đang bán" : "Tạm ẩn"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="mt-4 flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
                <Checkbox
                  checked={variant.is_default}
                  onCheckedChange={(checked) => handleVariantChange(index, { is_default: checked === true })}
                />
                <span className="text-sm">Đặt làm biến thể mặc định</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      const response = await fetch(initialValue ? `/api/srx/products/${initialValue.id}` : "/api/srx/products", {
        method: initialValue ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Product save failed", result);
        throw new Error(getApiErrorMessage(result, "Không thể lưu sản phẩm"));
      }

      toast.success(isEditing ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm mới");
      router.push("/srx/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu sản phẩm");
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
                <Link href="/srx/products">Sản phẩm</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isEditing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h1>
          </div>

          <Button variant="outline" asChild>
            <Link href="/srx/products">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>

      <form id="srx-product-form" className="grid gap-6" style={editorLayoutStyle} onSubmit={handleSubmit}>
        <div className="min-w-0">
          <Card style={editorCardStyle}>
            <CardHeader>
              <CardTitle>Nội dung chính</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6" style={editorContentStyle}>
              <div className="grid gap-2">
                <Label htmlFor="product-name">Tên sản phẩm</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nhập tên sản phẩm"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-short-description">Mô tả ngắn</Label>
                <Textarea
                  id="product-short-description"
                  className="min-h-32"
                  value={form.short_description}
                  onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))}
                  placeholder="Tóm tắt ngắn cho sản phẩm"
                />
              </div>

              <div className="grid gap-2">
                <Label>Mô tả chi tiết</Label>
                <CkeditorContentEditor
                  disabled={isSubmitting}
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder="Nhập mô tả chi tiết của sản phẩm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-usage">Hướng dẫn sử dụng</Label>
                <Textarea
                  id="product-usage"
                  className="min-h-36"
                  value={form.usage_instructions}
                  onChange={(event) => setForm((current) => ({ ...current, usage_instructions: event.target.value }))}
                  placeholder="Nhập hướng dẫn sử dụng"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-ingredients">Thành phần</Label>
                <Textarea
                  id="product-ingredients"
                  className="min-h-36"
                  value={form.ingredient_list}
                  onChange={(event) => setForm((current) => ({ ...current, ingredient_list: event.target.value }))}
                  placeholder="Nhập danh sách thành phần"
                />
              </div>

              {variantConfigurationSection}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card style={editorCardStyle}>
            <CardHeader>
              <CardTitle>Thiết lập sản phẩm</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5" style={editorContentStyle}>
              <div className="grid gap-2">
                <Label htmlFor="product-code">Mã sản phẩm</Label>
                <Input
                  id="product-code"
                  value={form.product_code}
                  onChange={(event) => setForm((current) => ({ ...current, product_code: event.target.value }))}
                  placeholder="Ví dụ: SRX-AMP-001"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Để trống để tự sinh"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="product-base-price">Giá gốc</Label>
                  <Input
                    id="product-base-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.base_price}
                    onChange={(event) => setForm((current) => ({ ...current, base_price: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="product-sale-price">Giá khuyến mãi</Label>
                  <Input
                    id="product-sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(event) => setForm((current) => ({ ...current, sale_price: event.target.value }))}
                    placeholder="Để trống nếu không có"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-category">Danh mục</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, category_id: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger id="product-category" className="w-full">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân loại</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.parent_name ? `${category.parent_name} / ${category.name}` : category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-brand">Thương hiệu</Label>
                <Select
                  value={form.brand_id || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, brand_id: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger id="product-brand" className="w-full">
                    <SelectValue placeholder="Chọn thương hiệu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có thương hiệu</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.is_active ? brand.name : `${brand.name} (ẩn)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-status">Trạng thái</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as ProductFormState["status"] }))
                  }
                >
                  <SelectTrigger id="product-status" className="w-full">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {srxProductStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-published-at">Ngày xuất bản</Label>
                <Input
                  id="product-published-at"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))}
                />
              </div>

              <ProductMediaFields
                disabled={isSubmitting}
                thumbnailUrl={form.thumbnail_url}
                infoImageUrl={form.info_img}
                galleryImageUrls={form.gallery_image_urls}
                onThumbnailUrlChange={(value) => setForm((current) => ({ ...current, thumbnail_url: value }))}
                onInfoImageUrlChange={(value) => setForm((current) => ({ ...current, info_img: value }))}
                onGalleryImageUrlsChange={(value) => setForm((current) => ({ ...current, gallery_image_urls: value }))}
              />

              <div className="grid gap-3">
                <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.is_featured}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_featured: checked === true }))}
                  />
                  <span className="text-sm">Đánh dấu sản phẩm nổi bật</span>
                </label>

                <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.has_variants}
                    onCheckedChange={(checked) =>
                      setForm((current) => {
                        const nextHasVariants = checked === true;

                        if (!nextHasVariants) {
                          return { ...current, has_variants: false };
                        }

                        if (current.variants.length > 0) {
                          return { ...current, has_variants: true };
                        }

                        return {
                          ...current,
                          has_variants: true,
                          variants: [
                            createEmptyVariantState(
                              1,
                              current.product_code,
                              current.base_price,
                              current.sale_price,
                              current.thumbnail_url,
                            ),
                          ],
                        };
                      })
                    }
                  />
                  <span className="text-sm">Sản phẩm có biến thể</span>
                </label>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Thành phần</Label>
                  <span className="text-muted-foreground text-xs">{form.tag_ids.length} thành phần được chọn</span>
                </div>

                <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-md border p-4 md:grid-cols-2 lg:grid-cols-1 nice-scroll">
                  {tags.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      Chưa có thành phần nào. Hãy tạo mục trong Từ điển thành phần trước khi gắn cho sản phẩm.
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

            <CardFooter className="justify-end gap-3 border-t" style={editorFooterStyle}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/srx/products")}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
