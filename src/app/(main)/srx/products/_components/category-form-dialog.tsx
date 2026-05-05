"use client";

import * as React from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SrxProductCategory, SrxProductCategoryMutationInput } from "@/lib/srx-products.shared";

type CategoryFormState = SrxProductCategoryMutationInput;

const emptyFormState: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  parent_id: "",
  is_active: true,
  sort_order: 0,
};

function buildFormState(category: SrxProductCategory | null): CategoryFormState {
  if (!category) {
    return emptyFormState;
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    image_url: category.image_url,
    parent_id: category.parent_id,
    is_active: category.is_active,
    sort_order: category.sort_order,
  };
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  initialValue,
  categories,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxProductCategory | null;
  categories: SrxProductCategory[];
  isSubmitting: boolean;
  onSubmit: (value: CategoryFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<CategoryFormState>(() => buildFormState(initialValue));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  const parentOptions = React.useMemo(
    () => categories.filter((category) => category.id !== initialValue?.id),
    [categories, initialValue?.id],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Sửa danh mục sản phẩm" : "Thêm danh mục sản phẩm"}</DialogTitle>
          <DialogDescription>Danh mục giúp nhóm sản phẩm đúng vị trí trên website và trang shop.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="product-category-name">Tên danh mục</Label>
            <Input
              id="product-category-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category-slug">Slug</Label>
            <Input
              id="product-category-slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Để trống để tự sinh"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category-parent">Danh mục cha</Label>
            <Select
              value={form.parent_id || "none"}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, parent_id: value === "none" ? "" : value }))
              }
            >
              <SelectTrigger id="product-category-parent" className="w-full">
                <SelectValue placeholder="Chọn danh mục cha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không có danh mục cha</SelectItem>
                {parentOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.parent_name ? `${category.parent_name} / ${category.name}` : category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category-description">Mô tả</Label>
            <Textarea
              id="product-category-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category-image">Ảnh đại diện</Label>
            <Input
              id="product-category-image"
              value={form.image_url}
              onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="product-category-order">Thứ tự</Label>
              <Input
                id="product-category-order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sort_order: Number(event.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked === true }))}
                />
                <span className="text-sm">Đang hoạt động</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo danh mục"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
