/**
 * Danh mục nhà cung cấp AI và model cho phần tin tức. Dùng chung cho cả client
 * (dropdown chọn model) lẫn server (model mặc định khi gọi API).
 *
 * Nhà cung cấp đổi tên model khá thường xuyên: khi cần thêm/bớt model thì sửa
 * đúng file này, không rải ra nhiều nơi. ID phải là ID thật của API tương ứng.
 */

export const srxAiTextProviderIds = ["claude", "chatgpt", "gemini", "deepseek"] as const;
export type SrxAiTextProviderId = (typeof srxAiTextProviderIds)[number];

/** Chỉ OpenAI và Gemini có API tạo ảnh mà CRM đang dùng. */
export const srxAiImageProviderIds = ["chatgpt", "gemini"] as const;
export type SrxAiImageProviderId = (typeof srxAiImageProviderIds)[number];

export type SrxAiModelOption = {
  id: string;
  label: string;
  hint: string;
};

export const srxAiProviderLabels: Record<SrxAiTextProviderId, string> = {
  claude: "Claude (Anthropic)",
  chatgpt: "ChatGPT (OpenAI)",
  gemini: "Gemini (Google)",
  deepseek: "DeepSeek",
};

export const srxAiTextModels: Record<SrxAiTextProviderId, SrxAiModelOption[]> = {
  claude: [
    { id: "claude-opus-5", label: "Opus 5", hint: "Viết sâu, bám rubric tốt nhất" },
    { id: "claude-sonnet-5", label: "Sonnet 5", hint: "Cân bằng chất lượng và chi phí" },
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", hint: "Nhanh, rẻ, hợp bài ngắn" },
  ],
  chatgpt: [
    { id: "gpt-4o", label: "GPT-4o", hint: "Ổn định cho bài dài" },
    { id: "gpt-4.1", label: "GPT-4.1", hint: "Bám hướng dẫn tốt hơn 4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Nhanh, rẻ" },
  ],
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Nhanh, chi phí thấp" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Lập luận và bài dài tốt hơn" },
  ],
  deepseek: [
    { id: "deepseek-chat", label: "DeepSeek Chat", hint: "Mặc định, chi phí thấp" },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner", hint: "Suy luận kỹ, chậm hơn" },
  ],
};

export const srxAiImageModels: Record<SrxAiImageProviderId, SrxAiModelOption[]> = {
  chatgpt: [
    { id: "gpt-image-1", label: "GPT Image 1", hint: "Chất lượng cao, theo đúng tỷ lệ đã chọn" },
    { id: "gpt-image-1-mini", label: "GPT Image 1 mini", hint: "Rẻ hơn, chất lượng thấp hơn" },
  ],
  gemini: [
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", hint: "Nhanh, chi phí thấp" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", hint: "Đẹp hơn, cần key được bật model này" },
  ],
};

export function getSrxAiDefaultTextModel(provider: SrxAiTextProviderId): string {
  return srxAiTextModels[provider][0].id;
}

export function getSrxAiDefaultImageModel(provider: SrxAiImageProviderId): string {
  return srxAiImageModels[provider][0].id;
}
