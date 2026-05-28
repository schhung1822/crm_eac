/* eslint-disable max-lines */
"use client";

import * as React from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type SrxProductTag,
  type SrxProductTagMutationInput,
  type SrxProductTagOptionCatalog,
} from "@/lib/srx-products.shared";

import { OptionMultiSelectField } from "./option-multi-select-field";
import { TagImageField } from "./tag-image-field";

type TagFormState = SrxProductTagMutationInput;

const emptyFormState: TagFormState = {
  name: "",
  slug: "",
  description: "",
  desc_long: "",
  class: [],
  stars: "",
  image_url: "",
  tag_groups: [],
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
      <div className="text-muted-foreground bg-muted/40 flex min-h-[520px] items-center justify-center rounded-lg border border-dashed text-sm">
        Đang tải trình soạn thảo chi tiết thành phần
      </div>
    ),
    ssr: false,
  },
);

function normalizeOptionValue(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function mergeOptionValues(...collections: ReadonlyArray<readonly (string | null | undefined)[]>): string[] {
  const mergedValues: string[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    for (const rawValue of collection) {
      const value = normalizeOptionValue(rawValue);

      if (!value || seen.has(value)) {
        continue;
      }

      seen.add(value);
      mergedValues.push(value);
    }
  }

  return mergedValues;
}

function buildFormState(tag: SrxProductTag | null): TagFormState {
  if (!tag) {
    return emptyFormState;
  }

  return {
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    desc_long: tag.desc_long,
    class: mergeOptionValues(tag.class),
    stars: tag.stars === null ? "" : String(tag.stars),
    image_url: tag.image_url,
    tag_groups: mergeOptionValues(tag.tag_groups),
  };
}

function formatApiIssues(result: unknown): string {
  if (!result || typeof result !== "object" || !("issues" in result) || !Array.isArray(result.issues)) {
    return "";
  }

  return result.issues
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
}

function getApiErrorMessage(result: unknown, fallbackMessage: string): string {
  if (!result || typeof result !== "object") {
    return fallbackMessage;
  }

  const message = "message" in result && typeof result.message === "string" ? result.message : "";
  const issueSummary = formatApiIssues(result);

  if (message && issueSummary) {
    return `${message}\n${issueSummary}`;
  }

  return issueSummary || message || fallbackMessage;
}

export function ProductTagEditorForm({
  initialValue,
  optionCatalog,
}: {
  initialValue: SrxProductTag | null;
  optionCatalog: SrxProductTagOptionCatalog;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<TagFormState>(() => buildFormState(initialValue));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [classOptions, setClassOptions] = React.useState<string[]>(() =>
    mergeOptionValues(optionCatalog.classOptions, initialValue?.class ?? []),
  );
  const [benefitOptions, setBenefitOptions] = React.useState<string[]>(() =>
    mergeOptionValues(optionCatalog.benefitOptions, initialValue?.tag_groups ?? []),
  );

  const isEditing = initialValue !== null;
  const submitLabel = isSubmitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo thành phần";

  const handleClassToggle = React.useCallback((value: string, checked: boolean) => {
    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
      return;
    }

    setForm((current) => ({
      ...current,
      class: checked
        ? mergeOptionValues(current.class, [normalizedValue])
        : current.class.filter((item) => item !== normalizedValue),
    }));
  }, []);

  const handleBenefitToggle = React.useCallback((value: string, checked: boolean) => {
    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
      return;
    }

    setForm((current) => ({
      ...current,
      tag_groups: checked
        ? mergeOptionValues(current.tag_groups, [normalizedValue])
        : current.tag_groups.filter((item) => item !== normalizedValue),
    }));
  }, []);

  const handleClassCreate = React.useCallback((value: string) => {
    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
      return;
    }

    setClassOptions((current) => mergeOptionValues(current, [normalizedValue]));
    setForm((current) => ({
      ...current,
      class: mergeOptionValues(current.class, [normalizedValue]),
    }));
  }, []);

  const handleBenefitCreate = React.useCallback((value: string) => {
    const normalizedValue = normalizeOptionValue(value);

    if (!normalizedValue) {
      return;
    }

    setBenefitOptions((current) => mergeOptionValues(current, [normalizedValue]));
    setForm((current) => ({
      ...current,
      tag_groups: mergeOptionValues(current.tag_groups, [normalizedValue]),
    }));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: TagFormState = {
      ...form,
      class: mergeOptionValues(form.class),
      tag_groups: mergeOptionValues(form.tag_groups),
    };

    try {
      setIsSubmitting(true);

      const response = await fetch(
        initialValue ? `/api/srx/product-tags/${initialValue.id}` : "/api/srx/product-tags",
        {
          method: initialValue ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, "Không thể lưu thành phần"));
      }

      toast.success(isEditing ? "Đã cập nhật thành phần" : "Đã tạo thành phần mới");
      router.push("/srx/product_tags");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu thành phần");
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
                <Link href="/srx/product_tags">Từ điển thành phần</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isEditing ? "Sửa thành phần" : "Thêm thành phần"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Sửa thành phần" : "Thêm thành phần"}</h1>
            <p className="text-muted-foreground max-w-3xl">
              Quản lý thông tin các thành phần hiển thị trên website website
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/srx/product_tags">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>

      <form id="srx-product-tag-form" className="grid gap-6" style={editorLayoutStyle} onSubmit={handleSubmit}>
        <div className="min-w-0">
          <Card style={editorCardStyle}>
            <CardHeader>
              <CardTitle>Nội dung thành phần</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6" style={editorContentStyle}>
              <div className="grid gap-2">
                <Label htmlFor="product-tag-name">Tên thành phần</Label>
                <Input
                  id="product-tag-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nhập tên thành phần"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-tag-description">Mô tả ngắn</Label>
                <Textarea
                  id="product-tag-description"
                  className="min-h-32"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Mô tả ngắn cho thành phần"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <Label>Mô tả chi tiết</Label>
                <CkeditorContentEditor
                  disabled={isSubmitting}
                  value={form.desc_long}
                  onChange={(value) => setForm((current) => ({ ...current, desc_long: value }))}
                  placeholder="Nhập nội dung chi tiết cho thành phần"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card style={editorCardStyle}>
            <CardHeader>
              <CardTitle>Thiết lập</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5" style={editorContentStyle}>
              <div className="grid gap-2">
                <Label htmlFor="product-tag-slug">Slug</Label>
                <Input
                  id="product-tag-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Để trống tự sinh"
                  disabled={isSubmitting}
                />
              </div>

              <OptionMultiSelectField
                id="product-tag-class"
                label="Phân loại"
                options={classOptions}
                selectedValues={form.class}
                onToggle={handleClassToggle}
                onCreate={handleClassCreate}
                placeholder="Chọn một hoặc nhiều loại"
                searchPlaceholder="Tìm phân loại..."
                disabled={isSubmitting}
              />

              <div className="grid gap-2">
                <Label htmlFor="product-tag-stars">Đánh giá</Label>
                <Input
                  id="product-tag-stars"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.stars}
                  onChange={(event) => setForm((current) => ({ ...current, stars: event.target.value }))}
                  placeholder="VD: 4.5"
                  disabled={isSubmitting}
                />
              </div>

              <TagImageField
                disabled={isSubmitting}
                value={form.image_url}
                onChange={(imageUrl) => setForm((current) => ({ ...current, image_url: imageUrl }))}
                onUploadingChange={setIsUploadingImage}
              />

              <OptionMultiSelectField
                id="product-tag-benefits"
                label="Lợi ích"
                options={benefitOptions}
                selectedValues={form.tag_groups}
                onToggle={handleBenefitToggle}
                onCreate={handleBenefitCreate}
                placeholder="Chọn một hoặc nhiều lợi ích"
                searchPlaceholder="Tìm lợi ích..."
                disabled={isSubmitting}
              />
            </CardContent>

            <CardFooter className="justify-end gap-3 border-t" style={editorFooterStyle}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/srx/product_tags")}
                disabled={isSubmitting || isUploadingImage}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingImage}>
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
