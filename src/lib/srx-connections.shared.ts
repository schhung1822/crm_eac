export type SrxConnectionId = "claude" | "chatgpt" | "gemini" | "deepseek" | "google-drive" | "facebook" | "zalo";

export type SrxConnectionCategory = "ai" | "integration" | "other";

export type SrxConnectionFieldType = "text" | "secret" | "textarea";

export type SrxConnectionField = {
  key: string;
  label: string;
  type: SrxConnectionFieldType;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
};

export type SrxConnectionDefinition = {
  id: SrxConnectionId;
  label: string;
  category: SrxConnectionCategory;
  /** Đường dẫn logo trong public/images. */
  logo: string;
  /** Dòng mô tả ngắn hiển thị dưới tên kết nối. */
  summary: string;
  /** Biến môi trường thay thế nếu không muốn nhập key trong giao diện. */
  envKey?: string;
  /** Field bí mật (API key / token). Bỏ trống khi credential được quản lý nơi khác. */
  secret?: SrxConnectionField;
  /** Các field cấu hình không phải bí mật. */
  fields: SrxConnectionField[];
  /** Ghi chú hiển thị trong form. */
  note?: string;
};

export const srxConnectionCategoryLabels: Record<SrxConnectionCategory, string> = {
  ai: "AI",
  integration: "Tích hợp",
  other: "Khác",
};

export const srxConnectionCatalog: SrxConnectionDefinition[] = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    category: "ai",
    logo: "/images/claude.webp",
    summary: "Model Claude cho phân tích và sinh nội dung",
    envKey: "ANTHROPIC_API_KEY",
    secret: { key: "apiKey", label: "API key", type: "secret", placeholder: "sk-ant-..." },
    fields: [],
  },
  {
    id: "chatgpt",
    label: "ChatGPT (OpenAI)",
    category: "ai",
    logo: "/images/gpt.webp",
    summary: "Model GPT cho nội dung và tạo ảnh",
    envKey: "OPENAI_API_KEY",
    secret: { key: "apiKey", label: "API key", type: "secret", placeholder: "sk-..." },
    fields: [],
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    category: "ai",
    logo: "/images/gemini.webp",
    summary: "Model Gemini cho nội dung và ảnh",
    envKey: "GEMINI_API_KEY",
    secret: { key: "apiKey", label: "API key", type: "secret", placeholder: "AIza..." },
    fields: [],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    category: "ai",
    logo: "/images/deepseek.webp",
    summary: "Model DeepSeek chi phí thấp",
    envKey: "DEEPSEEK_API_KEY",
    secret: { key: "apiKey", label: "API key", type: "secret", placeholder: "sk-..." },
    fields: [],
  },
  {
    id: "google-drive",
    label: "Google Drive",
    category: "integration",
    logo: "/images/google-drive.svg",
    summary: "Đọc ghi file trên Drive bằng credential service account",
    secret: {
      key: "serviceAccountJson",
      label: "Credential (service account JSON)",
      type: "textarea",
      placeholder: '{ "type": "service_account", "client_email": "...", "private_key": "..." }',
      hint: "Tải file JSON key từ Google Cloud Console rồi chọn file hoặc dán nội dung vào đây.",
    },
    fields: [
      {
        key: "folderId",
        label: "Folder ID mặc định",
        type: "text",
        optional: true,
        hint: "Nhớ chia sẻ thư mục này cho email service account.",
      },
    ],
    note: "Service account phải bật Google Drive API và được chia sẻ quyền trên thư mục cần dùng.",
  },
  {
    id: "facebook",
    label: "Facebook Page",
    category: "other",
    logo: "/images/facebook.webp",
    summary: "Đăng bài tự động lên fanpage SRX",
    envKey: "SRX_FACEBOOK_PAGE_ACCESS_TOKEN",
    secret: { key: "pageAccessToken", label: "Page Access Token", type: "secret", placeholder: "EAAG..." },
    fields: [
      { key: "pageId", label: "Page ID", type: "text", placeholder: "1149491654916679" },
      { key: "graphApiVersion", label: "Graph API version", type: "text", placeholder: "v20.0", optional: true },
      { key: "schedulerLimit", label: "Scheduler limit", type: "text", placeholder: "20", optional: true },
    ],
  },
  {
    id: "zalo",
    label: "Zalo OA",
    category: "other",
    logo: "/images/zalo.webp",
    summary: "Đăng bài viết lên Zalo Official Account",
    fields: [
      { key: "articleAuthor", label: "Tác giả bài viết", type: "text", placeholder: "SRX", optional: true },
      {
        key: "articleCreateUrl",
        label: "URL tạo bài",
        type: "text",
        placeholder: "https://openapi.zalo.me/v2.0/article/create",
        optional: true,
      },
      {
        key: "articleUpdateUrl",
        label: "URL cập nhật bài",
        type: "text",
        placeholder: "https://openapi.zalo.me/v2.0/article/update",
        optional: true,
      },
      {
        key: "articleDeleteUrl",
        label: "URL xoá bài",
        type: "text",
        placeholder: "https://openapi.zalo.me/v2.0/article/remove",
        optional: true,
      },
      {
        key: "articleListUrl",
        label: "URL danh sách bài",
        type: "text",
        placeholder: "https://openapi.zalo.me/v2.0/article/getlist",
        optional: true,
      },
    ],
    note: "Access token Zalo lấy từ bảng token trong database, không nhập ở đây.",
  },
];

export const srxConnectionIds = srxConnectionCatalog.map((item) => item.id);

export function getSrxConnectionDefinition(id: string): SrxConnectionDefinition | undefined {
  return srxConnectionCatalog.find((item) => item.id === id);
}

export type SrxConnectionStatus = "unknown" | "ok" | "error";

/** Trạng thái gửi về trình duyệt — không bao giờ chứa giá trị bí mật thật. */
export type SrxConnectionState = {
  id: SrxConnectionId;
  connected: boolean;
  hasSecret: boolean;
  /** Bản che của secret, ví dụ "sk-a****9f2c". */
  secretPreview: string;
  /** Secret đang được lấy từ biến môi trường thay vì lưu trong file. */
  secretFromEnv: boolean;
  values: Record<string, string>;
  status: SrxConnectionStatus;
  statusMessage: string;
  checkedAt: string | null;
  updatedAt: string | null;
};

export const srxConnectionStatusLabels: Record<SrxConnectionStatus, string> = {
  unknown: "Chưa kiểm tra",
  ok: "Khả dụng",
  error: "Lỗi",
};
