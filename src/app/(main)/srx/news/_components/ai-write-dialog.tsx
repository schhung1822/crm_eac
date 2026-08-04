/* eslint-disable complexity -- hộp thoại có nhiều nhánh trạng thái tải/chọn model, tách nhỏ sẽ rối hơn. */
"use client";

import * as React from "react";

import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSrxAiDefaultTextModel, srxAiTextModels, type SrxAiTextProviderId } from "@/lib/srx-ai-models.shared";

import { AiProviderModelFields } from "./ai-provider-model-fields";
import { useSrxAiProviders } from "./use-srx-ai-providers";

/** value là mô tả gửi cho AI, label là tên ngắn hiển thị trong ô chọn. */
const TONE_OPTIONS = [
  { value: "Chuyên nghiệp, khoa học, dễ hiểu", label: "Khoa học", hint: "Chuyên nghiệp, khoa học, dễ hiểu" },
  { value: "Truyền cảm hứng, cao cấp, gần gũi", label: "Thương hiệu", hint: "Truyền cảm hứng, cao cấp, gần gũi" },
  { value: "Ngắn gọn, rõ ý, tối ưu chuyển đổi", label: "Chuyển đổi", hint: "Ngắn gọn, rõ ý, thúc đẩy hành động" },
];

export type AiWriteRequest = {
  provider: SrxAiTextProviderId;
  model: string;
  brief: string;
  audience: string;
  tone: string;
  /** true = tối ưu bài đang có, false = viết bài mới. */
  improve: boolean;
};

export function AiWriteDialog({
  hasContent,
  isWriting,
  disabled,
  onWrite,
}: {
  /** Bài đã có nội dung thì mới cho chọn chế độ tối ưu. */
  hasContent: boolean;
  isWriting: boolean;
  disabled?: boolean;
  onWrite: (request: AiWriteRequest) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const { providers, isLoading, error } = useSrxAiProviders(open);
  const [provider, setProvider] = React.useState<SrxAiTextProviderId | "">("");
  const [model, setModel] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [tone, setTone] = React.useState(TONE_OPTIONS[0].value);
  const [improve, setImprove] = React.useState(false);

  const availableProviders = providers.filter((item) => item.hasApiKey);
  const modelOptions = provider ? srxAiTextModels[provider] : [];

  // Chọn sẵn nhà cung cấp đầu tiên đang có key để bấm là chạy được ngay.
  React.useEffect(() => {
    if (provider || availableProviders.length === 0) {
      return;
    }

    const first = availableProviders[0].id;
    setProvider(first);
    setModel(getSrxAiDefaultTextModel(first));
  }, [availableProviders, provider]);

  React.useEffect(() => {
    if (!hasContent) {
      setImprove(false);
    }
  }, [hasContent]);

  function handleProviderChange(value: string) {
    const next = value as SrxAiTextProviderId;
    setProvider(next);
    setModel(getSrxAiDefaultTextModel(next));
  }

  async function handleSubmit() {
    if (!provider) {
      toast.error("Chưa có nhà cung cấp AI nào được cấu hình API key");
      return;
    }

    const succeeded = await onWrite({ provider, model, brief, audience, tone, improve });

    if (succeeded) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Sparkles className="size-4" />
          Viết bằng AI
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-5" />
            Viết bài bằng AI
          </DialogTitle>
          <DialogDescription>
            AI nghiên cứu rồi viết theo đúng bộ tiêu chí SEO/AEO/GEO đang dùng để chấm điểm, sau đó tự chấm luôn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {error || (!isLoading && availableProviders.length === 0) ? (
            <Alert>
              <AlertDescription className="text-xs leading-5">
                {error ?? "Chưa có API key AI nào."} Vào <span className="font-medium">Quản lý kết nối (/ai)</span> để
                nhập API key cho Claude, ChatGPT, Gemini hoặc DeepSeek.
              </AlertDescription>
            </Alert>
          ) : null}

          <AiProviderModelFields
            idPrefix="ai-write"
            providerOptions={availableProviders}
            modelOptions={modelOptions}
            provider={provider}
            model={model}
            onProviderChange={handleProviderChange}
            onModelChange={setModel}
            isLoading={isLoading}
            disabled={isWriting}
          />

          <div className="grid gap-2">
            <Label htmlFor="ai-write-mode">Chế độ</Label>
            <Select
              value={improve ? "improve" : "new"}
              onValueChange={(value) => setImprove(value === "improve")}
              disabled={isWriting || !hasContent}
            >
              <SelectTrigger id="ai-write-mode" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[min(22rem,calc(100vw-2rem))]">
                <SelectItem value="new">Viết bài mới</SelectItem>
                <SelectItem value="improve">Tối ưu bài hiện tại</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs leading-5">
              {hasContent
                ? "Tối ưu sẽ giữ nguyên thông tin đã có và sửa đúng những tiêu chí đang mất điểm."
                : "Bài chưa có nội dung nên chỉ viết mới được."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-write-brief">Yêu cầu thêm (tuỳ chọn)</Label>
            <Textarea
              id="ai-write-brief"
              rows={3}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="VD: nhấn vào công nghệ exosome, có bảng so sánh với retinol, tránh nói về giá..."
              disabled={isWriting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="ai-write-tone">Giọng văn</Label>
              <Select value={tone} onValueChange={setTone} disabled={isWriting}>
                <SelectTrigger id="ai-write-tone" className="w-full min-w-0">
                  <SelectValue>{TONE_OPTIONS.find((option) => option.value === tone)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-[min(22rem,calc(100vw-2rem))]">
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="items-start">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground text-xs leading-4 whitespace-normal">{option.hint}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-2">
              <Label htmlFor="ai-write-audience">Đối tượng đọc (tuỳ chọn)</Label>
              <Input
                id="ai-write-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="VD: khách da nhạy cảm, spa/clinic"
                disabled={isWriting}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-5">
            Tiêu đề và từ khoá mục tiêu lấy từ form bên ngoài. Để trống tiêu đề thì AI tự đặt.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isWriting}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isWriting || !provider}>
            {isWriting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
            {isWriting ? "AI đang viết..." : improve ? "Tối ưu bài" : "Viết bài"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
