// Nội dung bài viết SRX lưu dưới dạng HTML (CKEditor) nhưng bộ chấm điểm port từ
// GEO-Report-AI làm việc trên markdown. Module này chuyển đổi đủ dùng cho việc chấm
// điểm: heading, đoạn, list, link, ảnh, bảng, blockquote.

const BLOCK_TAGS = ["p", "div", "section", "article", "header", "footer"];

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&hellip;/gi, "…")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
}

function convertLists(html: string): string {
  // <ol> => danh sách đánh số, <ul> => gạch đầu dòng. Xử lý từng khối một.
  return html.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_match, tag: string, body: string) => {
    const ordered = tag.toLowerCase() === "ol";
    let index = 0;

    const items = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_liMatch, content: string) => {
      index += 1;
      const marker = ordered ? `${index}. ` : "- ";

      return `\n${marker}${content.replace(/\s+/g, " ").trim()}`;
    });

    return `\n\n${items}\n\n`;
  });
}

function convertTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, body: string) => {
    const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => {
      const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) =>
        cell[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );

      return `| ${cells.join(" | ")} |`;
    });

    return rows.length > 0 ? `\n\n${rows.join("\n")}\n\n` : "";
  });
}

/** Chuyển HTML của bài viết sang markdown rút gọn để chấm điểm. */
export function srxHtmlToMarkdown(html: string): string {
  if (!html) {
    return "";
  }

  let output = html;

  // Bỏ hẳn phần không phải nội dung.
  output = output.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  output = output.replace(/<!--[\s\S]*?-->/g, "");

  output = convertTables(output);
  output = convertLists(output);

  // Ảnh trước link để không nuốt mất cú pháp ảnh.
  output = output.replace(/<img[^>]*>/gi, (tag) => {
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const src = /src\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";

    return `\n\n![${alt}](${src})\n\n`;
  });

  output = output.replace(/<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, text) => {
    const label = String(text)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return label ? `[${label}](${href})` : "";
  });

  output = output.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_match, tag: string, text: string) => {
    const level = Number(tag.slice(1));
    const label = text
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return label ? `\n\n${"#".repeat(level)} ${label}\n\n` : "";
  });

  output = output.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, text: string) => {
    const label = String(text)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return label ? `\n\n> ${label}\n\n` : "";
  });

  output = output.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  output = output.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  output = output.replace(/<br\s*\/?>/gi, "\n");

  for (const tag of BLOCK_TAGS) {
    output = output.replace(new RegExp(`</${tag}>`, "gi"), "\n\n");
  }

  // Dọn thẻ còn lại rồi chuẩn hoá khoảng trắng.
  output = output.replace(/<[^>]+>/g, "");
  output = decodeEntities(output);
  output = output
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");

  return output.replace(/\n{3,}/g, "\n\n").trim();
}
