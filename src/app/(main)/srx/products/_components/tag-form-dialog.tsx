/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  srxProductTagGroupValues,
  type SrxProductTag,
  type SrxProductTagMutationInput,
} from "@/lib/srx-products.shared";

type TagFormState = SrxProductTagMutationInput;

const emptyFormState: TagFormState = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  tag_groups: [],
};

function buildFormState(tag: SrxProductTag | null): TagFormState {
  if (!tag) {
    return emptyFormState;
  }

  return {
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    image_url: tag.image_url,
    tag_groups: tag.tag_groups,
  };
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/srx/product-tags/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể tải ảnh thành phần lên");
  }

  return String(result.url ?? "");
}

function TagImageField({
  disabled,
  onChange,
  onUploadingChange,
  value,
}: {
  disabled: boolean;
  onChange: (nextValue: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  value: string;
}) {
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    onUploadingChange(isUploading);
  }, [isUploading, onUploadingChange]);

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadFile(files[0]);
      onChange(url);
      toast.success("Đã tải ảnh thành phần");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh thành phần");
    } finally {
      setIsUploading(false);

      if (inputReference.current) {
        inputReference.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label htmlFor="product-tag-image">Ảnh thành phần</Label>
        <Input
          id="product-tag-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload/products/..."
          disabled={disabled || isUploading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputReference}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleImageUpload(event.target.files)}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => inputReference.current?.click()}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {isUploading ? "Đang tải..." : "Tải ảnh lên"}
        </Button>

        {value ? (
          <Button type="button" variant="ghost" disabled={disabled || isUploading} onClick={() => onChange("")}>
            <Trash2 className="size-4" />
            Xóa ảnh
          </Button>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">Ảnh sẽ được lưu trong thư mục `upload/products`.</p>

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center">
            <img src={value} alt="Ảnh thành phần" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TagFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxProductTag | null;
  isSubmitting: boolean;
  onSubmit: (value: TagFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<TagFormState>(() => buildFormState(initialValue));
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  const handleTagGroupChange = (group: TagFormState["tag_groups"][number], checked: boolean) => {
    setForm((current) => ({
      ...current,
      tag_groups: checked
        ? [...new Set([...current.tag_groups, group])]
        : current.tag_groups.filter((item) => item !== group),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Sửa thành phần" : "Thêm thành phần"}</DialogTitle>
          <DialogDescription>
            Thành phần giúp gắn nhanh hoạt chất, chiết xuất hoặc công dụng vào sản phẩm.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="product-tag-name">Tên thành phần</Label>
                <Input
                  id="product-tag-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-tag-slug">Slug</Label>
                <Input
                  id="product-tag-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Để trống để tự sinh"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-tag-description">Mô tả</Label>
              <Textarea
                id="product-tag-description"
                className="min-h-28"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Mô tả ngắn cho thành phần"
                disabled={isSubmitting}
              />
            </div>

            <TagImageField
              disabled={isSubmitting}
              value={form.image_url}
              onChange={(imageUrl) => setForm((current) => ({ ...current, image_url: imageUrl }))}
              onUploadingChange={setIsUploadingImage}
            />

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Phân nhóm</Label>
                <span className="text-muted-foreground text-xs">{form.tag_groups.length} nhóm được chọn</span>
              </div>

              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                {srxProductTagGroupValues.map((group) => (
                  <label key={group} className="flex min-h-14 items-start gap-3 rounded-md border px-3 py-2">
                    <Checkbox
                      checked={form.tag_groups.includes(group)}
                      onCheckedChange={(checked) => handleTagGroupChange(group, checked === true)}
                    />
                    <span className="text-sm leading-5">{group}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isUploadingImage}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo thành phần"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
