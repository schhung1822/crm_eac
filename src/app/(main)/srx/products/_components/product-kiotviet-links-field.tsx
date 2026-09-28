"use client";

import { Link2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SrxKiotVietLinkView } from "@/lib/srx-kiotviet-links.shared";

import { ProductEacSearchPopover } from "./product-eac-search-popover";

const moneyFormatter = new Intl.NumberFormat("vi-VN");

export type KiotVietLinkTarget = {
  /** "" = cả sản phẩm; còn lại là SKU biến thể. */
  sku: string;
  label: string;
  /** Mã dùng để tự dò khi chưa liên kết (theo thứ tự ưu tiên). */
  fallbackCodes: string[];
};

function EmptyTargetHint({ target, hasProductLinks }: { target: KiotVietLinkTarget; hasProductLinks: boolean }) {
  if (target.sku && hasProductLinks) {
    return <p className="text-muted-foreground text-xs">Dùng liên kết chung của sản phẩm ở trên.</p>;
  }

  const codes = target.fallbackCodes.filter(Boolean);

  return (
    <p className="text-muted-foreground text-xs leading-5">
      Chưa liên kết.{" "}
      {codes.length > 0
        ? `Khi có đơn sẽ tự dò theo mã ${codes.join(" / ")} nếu mã này có trong KiotViet.`
        : "Đơn có sản phẩm này sẽ không đẩy được dòng này lên KiotViet."}
    </p>
  );
}

export function ProductKiotVietLinksField({
  disabled,
  links,
  onChange,
  targets,
}: {
  disabled: boolean;
  links: SrxKiotVietLinkView[];
  onChange: (links: SrxKiotVietLinkView[]) => void;
  targets: KiotVietLinkTarget[];
}) {
  const hasProductLinks = links.some((link) => link.variant_sku === "");
  const knownSkus = new Set(targets.map((target) => target.sku));
  const orphanCount = links.filter((link) => !knownSkus.has(link.variant_sku)).length;

  const updateLink = (index: number, patch: Partial<SrxKiotVietLinkView>) =>
    onChange(links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)));

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-4">
      <div className="space-y-1">
        <Label className="flex items-center gap-2">
          <Link2 className="size-4" />
          Liên kết KiotViet
        </Label>
        <p className="text-muted-foreground text-xs leading-5">
          Chọn sản phẩm KiotViet (bảng product_eac) tương ứng để đơn website tự đẩy đúng hàng về KiotViet. Combo hoặc
          quà tặng có thể gồm nhiều sản phẩm, mỗi sản phẩm kèm số lượng trong 1 phần bán.
        </p>
      </div>

      {targets.map((target) => {
        const targetLinks = links
          .map((link, index) => ({ link, index }))
          .filter(({ link }) => link.variant_sku === target.sku);

        return (
          <div key={target.sku || "__product"} className="bg-background grid gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span className="truncate">{target.label}</span>
                {target.sku ? (
                  <Badge variant="outline" className="font-mono">
                    {target.sku}
                  </Badge>
                ) : null}
              </div>
              <ProductEacSearchPopover
                disabled={disabled}
                onSelect={(option) =>
                  onChange([...links, { variant_sku: target.sku, procode: option.procode, quantity: 1, eac: option }])
                }
              />
            </div>

            {targetLinks.length === 0 ? (
              <EmptyTargetHint target={target} hasProductLinks={hasProductLinks} />
            ) : (
              <div className="divide-y rounded-md border">
                {targetLinks.map(({ link, index }) => (
                  <div key={`${link.procode}-${index}`} className="flex items-center gap-3 px-3 py-2">
                    <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
                      <span className="truncate">{link.eac?.name ?? "Không còn trong product_eac"}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {link.procode}
                        {link.eac ? ` · ${moneyFormatter.format(link.eac.base_price)}đ` : ""}
                        {link.eac && !link.eac.is_active ? " · ngừng kinh doanh" : ""}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={link.quantity}
                      onChange={(event) =>
                        updateLink(index, { quantity: Math.max(1, Number(event.target.value) || 1) })
                      }
                      className="h-8 w-20"
                      aria-label={`Số lượng ${link.procode}`}
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Bỏ liên kết ${link.procode}`}
                      disabled={disabled}
                      onClick={() => onChange(links.filter((_, linkIndex) => linkIndex !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {orphanCount > 0 ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {orphanCount} liên kết thuộc biến thể không còn trong form sẽ bị bỏ khi lưu.
        </p>
      ) : null}
    </div>
  );
}
