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
import { Textarea } from "@/components/ui/textarea";
import type { SrxNewsCategory, SrxNewsCategoryMutationInput } from "@/lib/srx-news.shared";

type CategoryFormState = SrxNewsCategoryMutationInput;

const emptyFormState: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
  sort_order: 0,
};

function buildFormState(category: SrxNewsCategory | null): CategoryFormState {
  if (!category) {
    return emptyFormState;
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    is_active: category.is_active,
    sort_order: category.sort_order,
  };
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxNewsCategory | null;
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          <DialogDescription>Danh mục sẽ được dùng để nhóm bài viết tin tức trên website.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Tên danh mục</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Để trống để tự sinh"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-description">Mô tả</Label>
            <Textarea
              id="category-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category-order">Thứ tự</Label>
              <Input
                id="category-order"
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
