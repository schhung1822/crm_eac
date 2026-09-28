"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

/** Giá lưu dạng chuỗi số thô ("150000" hoặc "150000.5"); ô nhập hiển thị kiểu Việt Nam ("150.000" / "150.000,5"). */
function formatPriceDisplay(rawValue: string): string {
  if (!rawValue) {
    return "";
  }

  const decimalIndex = rawValue.indexOf(".");
  const integerPart = decimalIndex === -1 ? rawValue : rawValue.slice(0, decimalIndex);
  const groups: string[] = [];

  for (let end = integerPart.length; end > 0; end -= 3) {
    groups.unshift(integerPart.slice(Math.max(0, end - 3), end));
  }

  const groupedInteger = groups.join(".");

  return decimalIndex === -1 ? groupedInteger : `${groupedInteger},${rawValue.slice(decimalIndex + 1)}`;
}

function parsePriceDisplay(displayValue: string): string {
  // Dấu chấm chỉ là phân cách hàng nghìn, dấu phẩy là phần thập phân.
  const cleanedValue = displayValue.replace(/[^\d,]/g, "");
  const [integerPart = "", ...decimalParts] = cleanedValue.split(",");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");

  if (decimalParts.length === 0) {
    return normalizedInteger;
  }

  return `${normalizedInteger || "0"}.${decimalParts.join("").slice(0, 2)}`;
}

function countDigits(value: string): number {
  return value.replace(/[^\d,]/g, "").length;
}

/** Vị trí con trỏ trong chuỗi đã định dạng sao cho đứng sau đúng số chữ số như trước khi định dạng. */
function findCaretPosition(formattedValue: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) {
    return 0;
  }

  let seenDigits = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/[\d,]/.test(formattedValue[index] ?? "")) {
      seenDigits += 1;
    }

    if (seenDigits === digitsBeforeCaret) {
      return index + 1;
    }
  }

  return formattedValue.length;
}

type PriceInputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  onValueChange: (rawValue: string) => void;
  value: string;
};

export function PriceInput({ onValueChange, value, ...props }: PriceInputProps) {
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const pendingCaretReference = React.useRef<number | null>(null);
  const displayValue = formatPriceDisplay(value);

  React.useLayoutEffect(() => {
    const input = inputReference.current;
    const pendingCaret = pendingCaretReference.current;

    if (!input || pendingCaret === null || document.activeElement !== input) {
      return;
    }

    pendingCaretReference.current = null;
    input.setSelectionRange(pendingCaret, pendingCaret);
  }, [displayValue]);

  return (
    <Input
      {...props}
      ref={inputReference}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={displayValue}
      onChange={(event) => {
        const nextDisplayValue = event.target.value;
        const caret = event.target.selectionStart ?? nextDisplayValue.length;
        const nextRawValue = parsePriceDisplay(nextDisplayValue);

        pendingCaretReference.current = findCaretPosition(
          formatPriceDisplay(nextRawValue),
          countDigits(nextDisplayValue.slice(0, caret)),
        );
        onValueChange(nextRawValue);
      }}
    />
  );
}
