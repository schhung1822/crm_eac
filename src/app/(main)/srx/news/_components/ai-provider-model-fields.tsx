"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SrxAiModelOption } from "@/lib/srx-ai-models.shared";

/** Cặp chọn "nhà cung cấp AI + model", dùng chung cho hộp thoại viết bài và tạo ảnh. */
export function AiProviderModelFields({
  idPrefix,
  modelLabel = "Model",
  providerOptions,
  modelOptions,
  provider,
  model,
  onProviderChange,
  onModelChange,
  isLoading,
  disabled,
}: {
  idPrefix: string;
  modelLabel?: string;
  providerOptions: Array<{ id: string; label: string }>;
  modelOptions: SrxAiModelOption[];
  provider: string;
  model: string;
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  isLoading: boolean;
  disabled: boolean;
}) {
  // Trigger chỉ hiện tên model; phần mô tả để trong danh sách cho khỏi tràn ô.
  const selectedModel = modelOptions.find((option) => option.id === model);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${idPrefix}-provider`}>Nhà cung cấp AI</Label>
        <Select
          value={provider}
          onValueChange={onProviderChange}
          disabled={disabled || isLoading || providerOptions.length === 0}
        >
          <SelectTrigger id={`${idPrefix}-provider`} className="w-full min-w-0">
            <SelectValue placeholder={isLoading ? "Đang tải..." : "Chọn AI"} />
          </SelectTrigger>
          <SelectContent className="max-w-[min(22rem,calc(100vw-2rem))]">
            {providerOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${idPrefix}-model`}>{modelLabel}</Label>
        <Select value={model} onValueChange={onModelChange} disabled={disabled || !provider}>
          <SelectTrigger id={`${idPrefix}-model`} className="w-full min-w-0">
            <SelectValue placeholder="Chọn model">{selectedModel?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[min(22rem,calc(100vw-2rem))]">
            {modelOptions.map((option) => (
              <SelectItem key={option.id} value={option.id} className="items-start">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs leading-4 whitespace-normal">{option.hint}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
