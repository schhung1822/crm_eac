"use client";

import * as React from "react";

import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseSrxProductEacOption, type SrxProductEacOption } from "@/lib/srx-kiotviet-links.shared";

const moneyFormatter = new Intl.NumberFormat("vi-VN");

/** Nút "Thêm sản phẩm KiotViet": gõ để tìm trong bảng product_eac theo mã hàng, mã vạch hoặc tên. */
export function ProductEacSearchPopover({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (option: SrxProductEacOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<SrxProductEacOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query.trim());

  React.useEffect(() => {
    if (!open || deferredQuery.length < 2) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/srx/kiotviet/product-eac?q=${encodeURIComponent(deferredQuery)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        setOptions(response.ok ? (result.items as unknown[]).map(parseSrxProductEacOption) : []);
      } catch {
        // Bị huỷ do gõ tiếp: bỏ qua.
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredQuery, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Plus className="size-4" />
          Thêm sản phẩm KiotViet
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(480px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Mã hàng, mã vạch hoặc tên sản phẩm..." />
          <CommandList className="nice-scroll max-h-80">
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Đang tìm...
              </div>
            ) : (
              <CommandEmpty>
                {deferredQuery.length < 2 ? "Gõ ít nhất 2 ký tự để tìm." : "Không tìm thấy sản phẩm."}
              </CommandEmpty>
            )}
            {!isLoading && options.length > 0 ? (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.procode}
                    value={option.procode}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate">{option.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {option.procode}
                        {option.is_active ? "" : " · ngừng kinh doanh"}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {moneyFormatter.format(option.base_price)}đ
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
