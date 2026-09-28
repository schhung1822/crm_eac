/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";

import { ExternalLink, Images, PencilLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BannerFormDialog } from "@/app/(main)/srx/banner/_components/banner-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSrxBanner, type SrxBanner, type SrxBannerMutationInput } from "@/lib/srx-website.shared";

type PopupItemStatus = { label: string; isLive: boolean };

function getPopupItemStatus(item: SrxBanner, now: Date): PopupItemStatus {
  if (!item.is_active) {
    return { label: "Đang tắt", isLive: false };
  }

  if (item.starts_at && item.starts_at > now) {
    return { label: `Bắt đầu ${item.starts_at.toLocaleDateString("vi-VN")}`, isLive: false };
  }

  if (item.ends_at && item.ends_at < now) {
    return { label: "Đã kết thúc", isLive: false };
  }

  return { label: "Đang chạy", isLive: true };
}

function sortPopupItems(items: SrxBanner[]): SrxBanner[] {
  return [...items].sort((left, right) =>
    left.sort_order !== right.sort_order
      ? left.sort_order - right.sort_order
      : right.created_at.getTime() - left.created_at.getTime(),
  );
}

function PopupItemRow({
  item,
  now,
  onDelete,
  onEdit,
}: {
  item: SrxBanner;
  now: Date;
  onDelete: (item: SrxBanner) => void;
  onEdit: (item: SrxBanner) => void;
}) {
  const status = getPopupItemStatus(item, now);

  return (
    <div className="flex gap-4 rounded-lg border p-3">
      <div className="bg-muted size-24 shrink-0 overflow-hidden rounded-md border">
        {item.image_url ? (
          <img src={item.image_url} alt={item.alt_text || item.title} className="size-full object-cover" />
        ) : null}
      </div>

      <div className="grid min-w-0 flex-1 content-start gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          <Badge variant={status.isLive ? "default" : "secondary"}>{status.label}</Badge>
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="truncate">{item.link_target || "Không có liên kết"}</span>
        </div>
        <div className="text-muted-foreground text-xs">
          Thứ tự {item.sort_order}
          {item.ends_at ? ` · Đến ${item.ends_at.toLocaleDateString("vi-VN")}` : ""}
          {item.button_label ? ` · Nút: ${item.button_label}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
          <PencilLine className="size-4" />
          Sửa
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="size-4" />
          Xóa
        </Button>
      </div>
    </div>
  );
}

export function PopupItemsCard({ initialItems }: { initialItems: SrxBanner[] }) {
  const [items, setItems] = React.useState(() => sortPopupItems(initialItems));
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SrxBanner | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const now = React.useMemo(() => new Date(), []);
  const liveCount = items.filter((item) => getPopupItemStatus(item, now).isLive).length;

  function openForm(item: SrxBanner | null) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleSubmit(value: SrxBannerMutationInput) {
    try {
      setIsSubmitting(true);

      const response = await fetch(editingItem ? `/api/srx/banners/${editingItem.id}` : "/api/srx/banners", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, position: "popup" }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu nội dung popup");
      }

      const saved = parseSrxBanner(result.banner);

      setItems((current) =>
        sortPopupItems(
          editingItem ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved],
        ),
      );
      toast.success(editingItem ? "Đã cập nhật nội dung popup" : "Đã thêm nội dung popup");
      setFormOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu nội dung popup");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: SrxBanner) {
    if (!window.confirm(`Xóa nội dung popup "${item.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/srx/banners/${item.id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể xóa nội dung popup");
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Đã xóa nội dung popup");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa nội dung popup");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="size-4" />
          Nội dung popup
        </CardTitle>
        <CardDescription>
          Mỗi mục là một ảnh trong popup, có tiêu đề ngắn và link khi khách bấm vào. Dùng chung cho trang chủ và trang
          chi tiết tin tức. {liveCount > 0 ? `Đang chạy ${liveCount}/${items.length} mục.` : null}
        </CardDescription>
        <CardAction>
          <Button type="button" onClick={() => openForm(null)}>
            <Plus className="size-4" />
            Thêm nội dung
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-3">
        {liveCount === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm leading-6">
            Chưa có nội dung nào đang chạy: trang chủ sẽ không hiện popup, còn trang chi tiết tin tức tạm dùng bộ ảnh
            mặc định của website.
          </div>
        ) : null}

        {items.map((item) => (
          <PopupItemRow
            key={item.id}
            item={item}
            now={now}
            onEdit={openForm}
            onDelete={(target) => void handleDelete(target)}
          />
        ))}
      </CardContent>

      <BannerFormDialog
        variant="popup"
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingItem}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
