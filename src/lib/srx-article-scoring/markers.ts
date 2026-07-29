// Dấu hiệu ngôn ngữ cho chấm điểm. Port từ GEO-Report-AI, rút gọn còn vi + en
// vì nội dung SRX là tiếng Việt (vẫn kèm tiếng Anh do hay lẫn thuật ngữ).

export type SrxLocaleMarkers = {
  /** Dấu hiệu đoạn "trả lời nhanh" / tóm tắt. */
  quickAnswer: RegExp;
  /** Dấu hiệu định nghĩa "X là ...". */
  entity: RegExp;
  /** Dấu hiệu nội dung được cập nhật. */
  update: RegExp;
  /** Từ để hỏi, dùng cho heading dạng câu hỏi. */
  question: RegExp;
};

const EN_QUICK = "in short|quick answer|tl;dr|in summary|key takeaway|bottom line";
const EN_ENTITY = "\\bis an?\\b|\\bare an?\\b|\\brefers to\\b|\\bis defined as\\b|\\bstands for\\b|\\bmeans\\b";
const EN_UPDATE = "updated|last updated";
const EN_QUESTION = "how|what|why|when|which|who|where|should";

const VI_QUICK = "trả lời nhanh|tóm tắt|tóm lại|tl;dr|nói ngắn gọn|điểm chính";
const VI_ENTITY = "là gì|là một|là những|được hiểu là|được định nghĩa|nghĩa là|định nghĩa";
const VI_UPDATE = "cập nhật|mới nhất";
const VI_QUESTION = "tại sao|làm sao|làm thế nào|khi nào|có nên|là gì|cách|bao nhiêu|nên chọn";

function join(vietnamese: string, english: string, locale: string): string {
  return locale.startsWith("vi") ? `${vietnamese}|${english}` : english;
}

export function srxMarkersFor(locale: string): SrxLocaleMarkers {
  const normalized = (locale || "vi").split("-")[0].toLowerCase();

  return {
    quickAnswer: new RegExp(join(VI_QUICK, EN_QUICK, normalized), "i"),
    entity: new RegExp(join(VI_ENTITY, EN_ENTITY, normalized), "i"),
    update: new RegExp(join(VI_UPDATE, EN_UPDATE, normalized), "i"),
    question: new RegExp(join(VI_QUESTION, EN_QUESTION, normalized), "i"),
  };
}
