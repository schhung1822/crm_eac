"use client";

import * as React from "react";

import { Check, ImagePlus, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ThumbnailSize = "1536x1024" | "1024x1024" | "1024x1536";

const SIZE_OPTIONS: Array<{ value: ThumbnailSize; label: string; hint: string }> = [
  { value: "1536x1024", label: "Ngang 3:2", hint: "Hợp ảnh bìa bài viết" },
  { value: "1024x1024", label: "Vuông 1:1", hint: "Hợp ảnh mạng xã hội" },
  { value: "1024x1536", label: "Dọc 2:3", hint: "Hợp ảnh chân dung" },
];

const STYLE_PRESETS = [
  { label: "Ảnh thật, tối giản", value: "clean minimal realistic photography, soft natural light" },
  { label: "Phòng lab cao cấp", value: "premium clinical laboratory mood, glass and steel, cool tones" },
  { label: "Ấm áp, gần gũi", value: "warm inviting lifestyle scene, golden hour light" },
  { label: "Phẳng, màu pastel", value: "flat illustration, pastel palette, simple shapes" },
];

export type AiImageDialogProps = {
  /** Tiêu đề bài — AI dựa vào đây để vẽ đúng chủ đề. */
  title: string;
  excerpt?: string;
  content?: string;
  /** Gọi khi người dùng chọn dùng ảnh này làm ảnh đại diện. */
  onUseAsFeatured: (url: string) => void;
  disabled?: boolean;
};

export function AiImageDialog({ title, excerpt, content, onUseAsFeatured, disabled }: AiImageDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [brief, setBrief] = React.useState("");
  const [size, setSize] = React.useState<ThumbnailSize>("1536x1024");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<{ url: string; sceneBrief?: string } | null>(null);

  const canGenerate = title.trim().length > 0;

  async function handleGenerate() {
    if (!canGenerate) {
      toast.error("Nhập tiêu đề bài viết trước khi tạo ảnh");
      return;
    }

    try {
      setIsGenerating(true);
      setResult(null);

      const response = await fetch("/api/srx/news/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-thumbnail",
          input: { title, excerpt, content, userBrief: brief, size },
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tạo được ảnh");
      }

      setResult({ url: payload.thumbnail.url, sceneBrief: payload.thumbnail.sceneBrief });
      toast.success("Đã tạo ảnh và lưu vào thư viện");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được ảnh");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUse() {
    if (!result) {
      return;
    }

    onUseAsFeatured(result.url);
    toast.success("Đã đặt làm ảnh đại diện");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Sparkles className="size-4" />
          Tạo ảnh bằng AI
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-5" />
            Tạo ảnh bằng AI
          </DialogTitle>
          <DialogDescription>
            AI đọc nội dung bài để vẽ đúng chủ đề. Ảnh được lưu vào thư viện, chọn xong có thể đặt luôn làm ảnh đại
            diện.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-image-brief">Mô tả ảnh mong muốn (tuỳ chọn)</Label>
            <Textarea
              id="ai-image-brief"
              rows={3}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="VD: phong cách tối giản, tông xanh dương, có chai serum đặt trên nền đá..."
              disabled={isGenerating}
            />
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs font-normal"
                  disabled={isGenerating}
                  onClick={() => setBrief((current) => (current ? `${current}, ${preset.value}` : preset.value))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-image-size">Tỷ lệ ảnh</Label>
            <Select value={size} onValueChange={(value) => setSize(value as ThumbnailSize)} disabled={isGenerating}>
              <SelectTrigger id="ai-image-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Khung xem trước: giữ chỗ cố định để không nhảy layout khi ảnh về. */}
          <div
            className={cn(
              "bg-muted/30 relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl border",
              isGenerating && "animate-pulse",
            )}
          >
            {isGenerating ? (
              <div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
                <Loader2 className="text-primary size-8 animate-spin" />
                <span>AI đang vẽ ảnh, thường mất 15-40 giây...</span>
              </div>
            ) : result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.url} alt="Ảnh do AI tạo" className="h-full w-full object-cover" />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
                <ImagePlus className="size-8 opacity-50" />
                <span>Ảnh sẽ hiện ở đây</span>
              </div>
            )}
          </div>

          {result?.sceneBrief ? (
            <p className="text-muted-foreground text-xs leading-5">
              <span className="font-medium">Cảnh AI chọn vẽ:</span> {result.sceneBrief}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => void handleGenerate()} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : result ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {result ? "Tạo lại" : "Tạo ảnh"}
          </Button>

          <Button type="button" onClick={handleUse} disabled={!result || isGenerating}>
            <Check className="size-4" />
            Dùng làm ảnh đại diện
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
