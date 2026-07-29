/* eslint-disable complexity, max-lines, @typescript-eslint/prefer-nullish-coalescing -- panel trợ lý AI có nhiều nhánh trạng thái; chuỗi rỗng phải rơi về mặc định nên dùng "||". */
"use client";

import * as React from "react";

import { Bot, FilePenLine, ImageIcon, Loader2, SearchCheck, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SrxNewsCategory, SrxNewsPostMutationInput, SrxNewsTag } from "@/lib/srx-news.shared";

export type NewsAiDraft = {
  content: string;
  excerpt: string;
  imagePrompt: string;
  seoKeywords: string[];
  slug: string;
  thumbnailPrompt: string;
  title: string;
};

type NewsAiScore = {
  aeo: number;
  geo: number;
  overall: number;
  seo: number;
  strengths: string[];
  suggestions: string[];
};

type NewsAiImage = {
  alt: string;
  caption: string;
  prompt: string;
  url: string;
};

type NewsAiAction =
  | "generate-content"
  | "score"
  | "improve"
  | "improve-from-score"
  | "generate-thumbnail"
  | "generate-inline-image";

type AiProvider = "fallback" | "gemini" | "openai";

type AiModelPreference = {
  modelId?: string;
  provider?: AiProvider;
};

type AiProviderConfig = {
  apiKey?: string;
  defaultModelId?: string;
  enabled?: boolean;
};

type AiSettingsResponse = {
  settings?: {
    gemini?: AiProviderConfig;
    openai?: AiProviderConfig;
  };
};

type AiModelOption = {
  description: string;
  label: string;
  modelId: string;
  provider: AiProvider;
  value: string;
};

const fallbackTextModel: AiModelOption = {
  description: "Dùng bộ chấm điểm và bản nháp nội bộ khi chưa có API key.",
  label: "SRX nội bộ",
  modelId: "local",
  provider: "fallback",
  value: "fallback:local",
};

const textModelCatalog: Array<Omit<AiModelOption, "value">> = [
  {
    description: "Nhanh, phù hợp tạo nội dung và chấm điểm bài viết hằng ngày.",
    label: "Gemini Flash",
    modelId: "gemini-3.5-flash",
    provider: "gemini",
  },
  {
    description: "Nhẹ hơn, phù hợp gợi ý tiêu đề, tóm tắt và cấu trúc bài viết.",
    label: "Gemini Flash-Lite",
    modelId: "gemini-3.1-flash-lite",
    provider: "gemini",
  },
  {
    description: "Phù hợp tối ưu nội dung dài và phân tích SEO/GEO/AEO kỹ hơn.",
    label: "GPT Luna",
    modelId: "gpt-5.6-luna",
    provider: "openai",
  },
  {
    description: "Phù hợp bài cần lập luận, biên tập và cải thiện nội dung sâu.",
    label: "GPT Sol",
    modelId: "gpt-5.6-sol",
    provider: "openai",
  },
];

const imageModelCatalog: Array<Omit<AiModelOption, "value">> = [
  {
    description:
      "Tạo ảnh thật bằng Gemini Image. Cần quota/billing hợp lệ; các gói miễn phí thường không đủ quyền để tạo ảnh.",
    label: "Gemini Image Lite",
    modelId: "nano-banana-2-lite",
    provider: "gemini",
  },
  {
    description: "Tạo ảnh thật chất lượng cao bằng Gemini Image. Cần quyền model và quota/billing hợp lệ.",
    label: "Gemini Image Pro",
    modelId: "nano-banana-pro",
    provider: "gemini",
  },
  {
    description: "Tạo ảnh thật bằng OpenAI. Cần API key có billing/quota cho image generation.",
    label: "GPT Image",
    modelId: "gpt-image-2",
    provider: "openai",
  },
  {
    description: "Thử model GPT Image mini khi tài khoản chưa có quyền GPT Image đầy đủ; vẫn cần billing/quota.",
    label: "GPT Image Mini",
    modelId: "gpt-image-1-mini",
    provider: "openai",
  },
  {
    description: "Model ảnh OpenAI cũ hơn, có thể khả dụng với một số API key đã bật billing.",
    label: "DALL-E 3",
    modelId: "dall-e-3",
    provider: "openai",
  },
];

async function requestNewsAi<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/srx/news/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Không thể xử lý tác vụ AI");
  }

  return result as T;
}

function hasUsableProvider(config: AiProviderConfig | undefined): boolean {
  return Boolean(config?.enabled && config.apiKey?.trim());
}

function withModelValue(option: Omit<AiModelOption, "value">): AiModelOption {
  return { ...option, value: `${option.provider}:${option.modelId}` };
}

function buildModelOptions(
  settings: AiSettingsResponse["settings"] | undefined,
  capability: "image" | "text",
): AiModelOption[] {
  const fallback = capability === "image" ? null : fallbackTextModel;
  const catalog = capability === "image" ? imageModelCatalog : textModelCatalog;
  const options = fallback ? [fallback] : [];

  for (const model of catalog) {
    if (model.provider === "fallback") continue;
    if (!hasUsableProvider(settings?.[model.provider])) continue;
    options.push(withModelValue(model));
  }

  const configuredDefault = settings?.gemini?.defaultModelId || settings?.openai?.defaultModelId;

  return options.sort((left, right) => {
    if (left.modelId === configuredDefault) return -1;
    if (right.modelId === configuredDefault) return 1;
    if (left.provider === "fallback") return 1;
    if (right.provider === "fallback") return -1;
    return left.label.localeCompare(right.label);
  });
}

function modelPreferenceFromValue(value: string): AiModelPreference {
  const [provider, ...modelParts] = value.split(":");
  const modelId = modelParts.join(":");

  return {
    modelId,
    provider: provider === "gemini" || provider === "openai" ? provider : "fallback",
  };
}

function appendInlineImage(content: string, image: NewsAiImage): string {
  const safeAlt = (image.alt || image.prompt || "Hình minh họa SRX").replaceAll('"', "'");
  const caption = image.caption || "Hình minh họa theo phong cách SRX.";
  const imageHtml = `<figure><img src="${image.url}" alt="${safeAlt}" /><figcaption>${caption}</figcaption></figure>`;

  return content.trim() ? `${content}\n${imageHtml}` : imageHtml;
}

export function NewsAiAssistant({
  categories,
  form,
  setForm,
  tags,
}: {
  categories: SrxNewsCategory[];
  form: SrxNewsPostMutationInput;
  setForm: React.Dispatch<React.SetStateAction<SrxNewsPostMutationInput>>;
  tags: SrxNewsTag[];
}) {
  const [topic, setTopic] = React.useState("");
  const [keywords, setKeywords] = React.useState("");
  const [audience, setAudience] = React.useState("Khách hàng quan tâm chăm sóc da và spa/clinic");
  const [contentGoal, setContentGoal] = React.useState("Bài tư vấn chuyên sâu, tối ưu SEO/GEO/AEO");
  const [tone, setTone] = React.useState("Chuyên nghiệp, khoa học, dễ hiểu");
  const [activeAction, setActiveAction] = React.useState<NewsAiAction | null>(null);
  const [draft, setDraft] = React.useState<NewsAiDraft | null>(null);
  const [score, setScore] = React.useState<NewsAiScore | null>(null);
  const [imagePrompt, setImagePrompt] = React.useState("");
  const [imageContext, setImageContext] = React.useState("");
  const [lastAiError, setLastAiError] = React.useState<string | null>(null);
  const [textModelOptions, setTextModelOptions] = React.useState<AiModelOption[]>([fallbackTextModel]);
  const [imageModelOptions, setImageModelOptions] = React.useState<AiModelOption[]>([]);
  const [selectedTextModel, setSelectedTextModel] = React.useState(fallbackTextModel.value);
  const [selectedImageModel, setSelectedImageModel] = React.useState("");
  const [isLoadingModels, setIsLoadingModels] = React.useState(true);

  const selectedCategory = categories.find((category) => category.id === form.category_id);
  const selectedTagNames = tags.filter((tag) => form.tag_ids.includes(tag.id)).map((tag) => tag.name);
  const isWorking = activeAction !== null;
  const selectedTextModelOption =
    textModelOptions.find((option) => option.value === selectedTextModel) ?? textModelOptions[0];
  const selectedImageModelOption = imageModelOptions.find((option) => option.value === selectedImageModel);
  const hasImageModel = Boolean(selectedImageModelOption);

  React.useEffect(() => {
    let isMounted = true;

    async function loadModelOptions() {
      try {
        const response = await fetch("/api/srx/ai-settings");
        const result = (await response.json()) as AiSettingsResponse;

        if (!response.ok) throw new Error("Không thể tải cấu hình AI");
        if (!isMounted) return;

        const nextTextOptions = buildModelOptions(result.settings, "text");
        const nextImageOptions = buildModelOptions(result.settings, "image");
        setTextModelOptions(nextTextOptions);
        setImageModelOptions(nextImageOptions);
        setSelectedTextModel(nextTextOptions[0]?.value ?? fallbackTextModel.value);
        setSelectedImageModel(nextImageOptions[0]?.value ?? "");
      } catch {
        if (!isMounted) return;
        setTextModelOptions([fallbackTextModel]);
        setImageModelOptions([]);
      } finally {
        if (isMounted) setIsLoadingModels(false);
      }
    }

    void loadModelOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const input = React.useMemo(
    () => ({
      categoryName: selectedCategory?.name ?? "Tin tức SRX",
      content: form.content,
      audience,
      contentGoal,
      excerpt: form.excerpt,
      keywords: keywords || selectedTagNames.join(", "),
      title: form.title,
      tone,
      topic: topic || form.title,
    }),
    [
      audience,
      contentGoal,
      form.content,
      form.excerpt,
      form.title,
      keywords,
      selectedCategory?.name,
      selectedTagNames,
      tone,
      topic,
    ],
  );

  async function runAction<T>(action: NewsAiAction, request: () => Promise<T>): Promise<T | null> {
    try {
      setActiveAction(action);
      setLastAiError(null);
      return await request();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xử lý tác vụ AI";
      setLastAiError(message);
      toast.error(message);
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function handleGenerateContent() {
    const result = await runAction("generate-content", () =>
      requestNewsAi<{ draft: NewsAiDraft }>({
        action: "generate-content",
        input,
        modelPreference: modelPreferenceFromValue(selectedTextModel),
      }),
    );

    if (!result) return;

    setDraft(result.draft);
    setImagePrompt(result.draft.thumbnailPrompt || result.draft.imagePrompt);
    toast.success("AI đã tạo bản nháp bài viết");
  }

  async function handleScore() {
    const result = await runAction("score", () =>
      requestNewsAi<{ score: NewsAiScore }>({
        action: "score",
        input,
        modelPreference: modelPreferenceFromValue(selectedTextModel),
      }),
    );

    if (!result) return;

    setScore(result.score);
    toast.success("Đã chấm điểm SEO/GEO/AEO");
  }

  async function handleImprove() {
    const result = await runAction("improve", () =>
      requestNewsAi<{ draft: NewsAiDraft; score: NewsAiScore }>({
        action: "improve",
        input,
        modelPreference: modelPreferenceFromValue(selectedTextModel),
      }),
    );

    if (!result) return;

    setDraft(result.draft);
    setScore(result.score);
    setImagePrompt(result.draft.thumbnailPrompt || result.draft.imagePrompt);
    toast.success("AI đã tối ưu lại bài viết");
  }

  async function handleImproveFromScore() {
    if (!score) {
      toast.error("Vui lòng chấm điểm bài viết trước khi cải thiện theo nhận xét");
      return;
    }

    const result = await runAction("improve-from-score", () =>
      requestNewsAi<{ draft: NewsAiDraft; score: NewsAiScore }>({
        action: "improve",
        input,
        modelPreference: modelPreferenceFromValue(selectedTextModel),
        score,
      }),
    );

    if (!result) return;

    setDraft(result.draft);
    setScore(result.score);
    setImagePrompt(result.draft.thumbnailPrompt || result.draft.imagePrompt);
    setForm((current) => ({
      ...current,
      content: result.draft.content,
      excerpt: result.draft.excerpt,
      slug: current.slug || result.draft.slug,
      title: result.draft.title,
    }));
    setKeywords(result.draft.seoKeywords.join(", "));
    toast.success("Đã cải thiện bài viết theo nhận xét AI");
  }

  async function handleGenerateImage(placement: "inline" | "thumbnail") {
    if (!selectedImageModel) {
      const message =
        "Vui lòng cấu hình và chọn model tạo ảnh AI thật trước khi tạo ảnh. Các model tạo ảnh thường cần quota/billing hợp lệ.";
      setLastAiError(message);
      toast.error(message);
      return;
    }

    const action: NewsAiAction = placement === "thumbnail" ? "generate-thumbnail" : "generate-inline-image";
    const result = await runAction(action, () =>
      requestNewsAi<{ image: NewsAiImage }>({
        action: "generate-image",
        input: {
          ...input,
          imageContext,
          modelPreference: modelPreferenceFromValue(selectedImageModel),
          placement,
          prompt: imagePrompt,
          textModelPreference: modelPreferenceFromValue(selectedTextModel),
        },
      }),
    );

    if (!result) return;

    setImagePrompt(result.image.prompt);
    setForm((current) =>
      placement === "thumbnail"
        ? { ...current, featured_image_url: result.image.url }
        : { ...current, content: appendInlineImage(current.content, result.image) },
    );
    toast.success(placement === "thumbnail" ? "Đã tạo thumbnail cho bài viết" : "Đã chèn ảnh vào nội dung");
  }

  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  }

  function applyDraft() {
    if (!draft) return;

    setForm((current) => ({
      ...current,
      content: draft.content,
      excerpt: draft.excerpt,
      slug: current.slug || draft.slug,
      title: draft.title,
    }));
    setKeywords(draft.seoKeywords.join(", "));
    toast.success("Đã áp dụng bản nháp AI vào bài viết");
  }

  return (
    <Card className="overflow-hidden border-dashed" onKeyDown={handlePanelKeyDown}>
      <CardHeader className="bg-muted/10 border-b px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border">
              <Bot className="size-4" />
            </span>
            <CardTitle className="text-base">Trợ lý AI cho tin tức</CardTitle>
          </div>
          <Badge variant={isWorking ? "default" : "outline"} className="w-fit gap-1">
            {isWorking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {isWorking ? "Đang xử lý" : "AI"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <div className="bg-muted/10 grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-2">
            <Label htmlFor="news-ai-topic">Brief / chủ đề</Label>
            <Input
              id="news-ai-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ví dụ: SRX Laboratory tại InterCharm Korea 2024"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="news-ai-tone">Giọng văn</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="news-ai-tone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chuyên nghiệp, khoa học, dễ hiểu">Khoa học</SelectItem>
                <SelectItem value="Truyền cảm hứng, cao cấp, gần gũi">Thương hiệu</SelectItem>
                <SelectItem value="Ngắn gọn, rõ ý, tối ưu chuyển đổi">Chuyển đổi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/10 grid gap-2 rounded-lg border p-3">
          <Label htmlFor="news-ai-keywords">Từ khóa SEO/GEO/AEO</Label>
          <Input
            id="news-ai-keywords"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="phân tách bằng dấu phẩy; nếu bỏ trống sẽ dùng thẻ đã chọn"
          />
        </div>
        <div className="bg-muted/10 grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="news-ai-content-goal">Mục tiêu nội dung</Label>
            <Select value={contentGoal} onValueChange={setContentGoal}>
              <SelectTrigger id="news-ai-content-goal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bài tư vấn chuyên sâu, tối ưu SEO/GEO/AEO">Tư vấn chuyên sâu</SelectItem>
                <SelectItem value="Bài tin tức thương hiệu, kể chuyện sự kiện và hoạt động SRX">
                  Tin tức thương hiệu
                </SelectItem>
                <SelectItem value="Bài giới thiệu công nghệ/sản phẩm, rõ cơ chế và lợi ích thực tế">
                  Công nghệ / sản phẩm
                </SelectItem>
                <SelectItem value="Bài FAQ giải đáp nhanh, tối ưu AEO và trích dẫn AI search">FAQ / AEO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="news-ai-audience">Đối tượng đọc</Label>
            <Input
              id="news-ai-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Ví dụ: khách hàng da nhạy cảm, spa/clinic, đại lý SRX"
            />
          </div>
        </div>

        <div className="bg-background grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="news-ai-text-model">Model nội dung</Label>
            <Select
              value={selectedTextModel}
              onValueChange={setSelectedTextModel}
              disabled={isLoadingModels || isWorking}
            >
              <SelectTrigger id="news-ai-text-model" className="w-full">
                <SelectValue placeholder="Chọn model" />
              </SelectTrigger>
              <SelectContent>
                {textModelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs leading-5">{selectedTextModelOption?.description}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="news-ai-image-model">Model tạo thumbnail</Label>
            <Select
              value={selectedImageModel}
              onValueChange={setSelectedImageModel}
              disabled={isLoadingModels || isWorking}
            >
              <SelectTrigger id="news-ai-image-model" className="w-full">
                <SelectValue placeholder="Chọn model" />
              </SelectTrigger>
              <SelectContent>
                {imageModelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs leading-5">
              {selectedImageModelOption?.description ??
                "Chưa có model tạo ảnh AI thật khả dụng. Vào mục Tích hợp AI để bật Gemini/OpenAI và nhập API key có billing/quota."}
            </p>
          </div>
        </div>

        {lastAiError ? (
          <Alert variant="destructive">
            <AlertTitle>Lỗi AI</AlertTitle>
            <AlertDescription className="text-xs leading-5 break-words">{lastAiError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="content" className="gap-3">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="image">Hình ảnh</TabsTrigger>
            <TabsTrigger value="score">Điểm</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleGenerateContent()} disabled={isWorking}>
                {activeAction === "generate-content" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FilePenLine className="size-4" />
                )}
                Tạo bản nháp
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleImprove()}
                disabled={isWorking || !form.content.trim()}
              >
                {activeAction === "improve" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <WandSparkles className="size-4" />
                )}
                Tối ưu bài hiện tại
              </Button>
              <Button type="button" variant="secondary" onClick={applyDraft} disabled={!draft || isWorking}>
                Áp dụng bản nháp
              </Button>
            </div>

            {draft ? (
              <div className="bg-muted/20 grid gap-2 rounded-lg border p-4">
                <div className="font-medium">{draft.title}</div>
                <p className="text-muted-foreground text-sm leading-6">{draft.excerpt}</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.seoKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="image" className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="news-ai-image-context">Đoạn nội dung cần minh họa</Label>
              <Textarea
                id="news-ai-image-context"
                className="min-h-20"
                value={imageContext}
                onChange={(event) => setImageContext(event.target.value)}
                placeholder="Nếu chèn ảnh vào nội dung, dán đoạn đang nói tới ở đây. Nếu bỏ trống AI sẽ tự đọc bài viết để chọn ngữ cảnh."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="news-ai-image-prompt">Prompt hình ảnh SRX</Label>
              <Textarea
                id="news-ai-image-prompt"
                className="min-h-20"
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="Có thể bỏ trống để AI tự tạo prompt theo nội dung bài viết hoặc đoạn nội dung cần minh họa."
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleGenerateImage("thumbnail")}
                disabled={isWorking || !hasImageModel}
              >
                {activeAction === "generate-thumbnail" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
                Tạo thumbnail
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleGenerateImage("inline")}
                disabled={isWorking || !hasImageModel}
              >
                {activeAction === "generate-inline-image" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
                Chèn ảnh vào nội dung
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="score" className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="bg-muted/20 grid gap-3 rounded-lg border p-4">
              <Button type="button" onClick={() => void handleScore()} disabled={isWorking || !form.content.trim()}>
                {activeAction === "score" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SearchCheck className="size-4" />
                )}
                Chấm điểm bài viết
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleImproveFromScore()}
                disabled={isWorking || !score || !form.content.trim()}
              >
                {activeAction === "improve-from-score" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <WandSparkles className="size-4" />
                )}
                Cải thiện theo nhận xét
              </Button>
              <p className="text-muted-foreground text-sm leading-6">
                Điểm số và checklist chi tiết hiển thị ở khối &ldquo;Điểm SEO / AEO / GEO&rdquo; bên cột phải.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
