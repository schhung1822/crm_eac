"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
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
import type { SrxNewsTag, SrxNewsTagMutationInput } from "@/lib/srx-news.shared";

type TagFormState = SrxNewsTagMutationInput;

const emptyFormState: TagFormState = {
  name: "",
  slug: "",
};

function buildFormState(tag: SrxNewsTag | null): TagFormState {
  if (!tag) {
    return emptyFormState;
  }

  return {
    name: tag.name,
    slug: tag.slug,
  };
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
  initialValue: SrxNewsTag | null;
  isSubmitting: boolean;
  onSubmit: (value: TagFormState) => Promise<void>;
}) {
  const [form, setForm] = React.useState<TagFormState>(() => buildFormState(initialValue));

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
          <DialogTitle>{initialValue ? "Sửa thẻ tin tức" : "Thêm thẻ tin tức"}</DialogTitle>
          <DialogDescription>Thẻ giúp phân loại và gom nhóm bài viết theo chủ đề nhỏ hơn.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="tag-name">Tên thẻ</Label>
            <Input
              id="tag-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tag-slug">Slug</Label>
            <Input
              id="tag-slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Để trống để tự sinh"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo thẻ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
