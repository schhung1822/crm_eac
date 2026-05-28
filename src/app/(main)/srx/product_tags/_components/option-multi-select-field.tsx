"use client";

import * as React from "react";

import { Check, ChevronDown, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function normalizeOptionValue(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function buildSelectionSummary(selectedValues: readonly string[], placeholder: string): string {
  if (selectedValues.length === 0) {
    return placeholder;
  }

  if (selectedValues.length <= 2) {
    return selectedValues.join(", ");
  }

  return `${selectedValues.slice(0, 2).join(", ")} +${selectedValues.length - 2}`;
}

export function OptionMultiSelectField({
  disabled = false,
  emptyMessage = "Không có lựa chọn nào phù hợp.",
  id,
  label,
  onCreate,
  onToggle,
  options,
  placeholder,
  searchPlaceholder,
  selectedValues,
}: {
  disabled?: boolean;
  emptyMessage?: string;
  id: string;
  label: string;
  onCreate?: (value: string) => void;
  onToggle: (value: string, checked: boolean) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  selectedValues: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const normalizedSearchValue = normalizeOptionValue(searchValue);
  const canCreate =
    normalizedSearchValue !== "" &&
    onCreate !== undefined &&
    !options.some((option) => option.localeCompare(normalizedSearchValue, "vi", { sensitivity: "accent" }) === 0);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-muted-foreground text-xs">{selectedValues.length} đã chọn</span>
      </div>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setSearchValue("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-2"
            disabled={disabled}
          >
            <span className="min-w-0 flex-1 text-left whitespace-normal">
              {buildSelectionSummary(selectedValues, placeholder)}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="nice-scroll w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
            <CommandList className="nice-scroll max-h-[280px]">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {canCreate ? (
                  <CommandItem
                    value={`__create__${normalizedSearchValue}`}
                    onSelect={() => {
                      onCreate(normalizedSearchValue);
                      setSearchValue("");
                    }}
                  >
                    <Plus className="size-4" />
                    <span>Them {normalizedSearchValue}</span>
                  </CommandItem>
                ) : null}

                {options.map((option) => {
                  const isSelected = selectedValues.includes(option);

                  return (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => onToggle(option, !isSelected)}
                      className="gap-3"
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-sm border",
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "border-input",
                        )}
                      >
                        <Check className={cn("size-3", isSelected ? "opacity-100" : "opacity-0")} />
                      </span>
                      <span className="flex-1 text-left whitespace-normal">{option}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedValues.length > 0 ? (
        <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto rounded-md border p-2">
          {selectedValues.map((value) => (
            <Badge key={value} variant="secondary" className="text-left leading-4 whitespace-normal">
              {value}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
