/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  srxBannerLinkTypeValues,
  srxBannerPositionValues,
  type SrxBanner,
  type SrxBannerMutationInput,
} from "@/lib/srx-website.shared";

import { BannerImageFields } from "./banner-image-fields";

type BannerFormState = SrxBannerMutationInput;

const compactGridClass = "grid grid-cols-2 gap-4 max-[520px]:grid-cols-1";

const emptyFormState: BannerFormState = {
  title: "",
  slug: "",
  description: "",
  image_url: "",
  mobile_image_url: "",
  alt_text: "",
  button_label: "",
  link_type: "custom",
  link_target: "",
  position: "homepage_hero",
  open_in_new_tab: false,
  sort_order: 0,
  starts_at: "",
  ends_at: "",
  is_active: true,
};

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

function buildFormState(banner: SrxBanner | null): BannerFormState {
  if (!banner) {
    return emptyFormState;
  }

  return {
    title: banner.title,
    slug: banner.slug,
    description: banner.description,
    image_url: banner.image_url,
    mobile_image_url: banner.mobile_image_url,
    alt_text: banner.alt_text,
    button_label: banner.button_label,
    link_type: banner.link_type,
    link_target: banner.link_target,
    position: banner.position,
    open_in_new_tab: banner.open_in_new_tab,
    sort_order: banner.sort_order,
    starts_at: toLocalDateTimeInput(banner.starts_at),
    ends_at: toLocalDateTimeInput(banner.ends_at),
    is_active: banner.is_active,
  };
}

function getLinkTypeLabel(value: BannerFormState["link_type"]): string {
  switch (value) {
    case "homepage":
      return "Trang chủ";
    case "product":
      return "Sản phẩm";
    case "category":
      return "Danh mục";
    case "post":
      return "Bài viết";
    case "custom":
      return "URL tùy chỉnh";
    default:
      return value;
  }
}

function getPositionLabel(value: BannerFormState["position"]): string {
  switch (value) {
    case "homepage_hero":
      return "Hero trang chủ";
    case "homepage_secondary":
      return "Banner phụ trang chủ";
    case "category_sidebar":
      return "Sidebar danh mục";
    case "popup":
      return "Popup";
    case "header_strip":
      return "Thanh đầu trang";
    default:
      return value;
  }
}

export function BannerFormDialog({
  open,
  onOpenChange,
  initialValue,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: SrxBanner | null;
  isSubmitting: boolean;
  onSubmit: (value: BannerFormState) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = React.useState<BannerFormState>(() => buildFormState(initialValue));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState(initialValue));
  }, [initialValue, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="min-h-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[600px]">
        <DrawerHeader>
          <DrawerTitle>{initialValue ? "Sửa banner" : "Thêm banner"}</DrawerTitle>
          <DrawerDescription>Quản lý banner hiển thị trên website SRX và lịch chạy của từng banner.</DrawerDescription>
        </DrawerHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-4">
              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="banner-title">Tiêu đề</Label>
                  <Input
                    id="banner-title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banner-slug">Slug</Label>
                  <Input
                    id="banner-slug"
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="Để trống để tự sinh"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="banner-description">Mô tả</Label>
                <Textarea
                  id="banner-description"
                  className="min-h-24"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              <BannerImageFields
                disabled={isSubmitting}
                imageUrl={form.image_url}
                mobileImageUrl={form.mobile_image_url}
                onImageUrlChange={(value) => setForm((current) => ({ ...current, image_url: value }))}
                onMobileImageUrlChange={(value) => setForm((current) => ({ ...current, mobile_image_url: value }))}
              />

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="banner-alt-text">Alt text</Label>
                  <Input
                    id="banner-alt-text"
                    value={form.alt_text}
                    onChange={(event) => setForm((current) => ({ ...current, alt_text: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banner-button-label">Nhãn nút</Label>
                  <Input
                    id="banner-button-label"
                    value={form.button_label}
                    onChange={(event) => setForm((current) => ({ ...current, button_label: event.target.value }))}
                    placeholder="Xem ngay"
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="banner-link-type">Loại liên kết</Label>
                  <Select
                    value={form.link_type}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, link_type: value as BannerFormState["link_type"] }))
                    }
                  >
                    <SelectTrigger id="banner-link-type">
                      <SelectValue placeholder="Chọn loại liên kết" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxBannerLinkTypeValues.map((linkType) => (
                        <SelectItem key={linkType} value={linkType}>
                          {getLinkTypeLabel(linkType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banner-link-target">Đích liên kết</Label>
                  <Input
                    id="banner-link-target"
                    value={form.link_target}
                    onChange={(event) => setForm((current) => ({ ...current, link_target: event.target.value }))}
                    placeholder="/san-pham/srx..."
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="banner-position">Vị trí</Label>
                  <Select
                    value={form.position}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, position: value as BannerFormState["position"] }))
                    }
                  >
                    <SelectTrigger id="banner-position">
                      <SelectValue placeholder="Chọn vị trí" />
                    </SelectTrigger>
                    <SelectContent>
                      {srxBannerPositionValues.map((position) => (
                        <SelectItem key={position} value={position}>
                          {getPositionLabel(position)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banner-order">Thứ tự</Label>
                  <Input
                    id="banner-order"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sort_order: Number(event.target.value || 0) }))
                    }
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <div className="grid gap-2">
                  <Label htmlFor="banner-starts">Bắt đầu</Label>
                  <Input
                    id="banner-starts"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banner-ends">Kết thúc</Label>
                  <Input
                    id="banner-ends"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </div>
              </div>

              <div className={compactGridClass}>
                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked === true }))}
                  />
                  <span className="text-sm">Đang hoạt động</span>
                </label>

                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    checked={form.open_in_new_tab}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, open_in_new_tab: checked === true }))
                    }
                  />
                  <span className="text-sm">Mở liên kết ở tab mới</span>
                </label>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialValue ? "Lưu thay đổi" : "Tạo banner"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
