export function normalizeText(value: unknown, fallback = "Không có"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatGenderLabel(gender: unknown): string {
  switch (String(gender ?? "").trim()) {
    case "male": {
      return "Nam";
    }
    case "female": {
      return "Nữ";
    }
    case "other": {
      return "Khác";
    }
    default: {
      return "Chưa xác định";
    }
  }
}
