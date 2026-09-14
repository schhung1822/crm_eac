import { existsSync } from "node:fs";

import type { RowDataPacket } from "mysql2/promise";

import {
  buildMobileImageUrl,
  ensureMobileImageVariant,
  MOBILE_IMAGE_WIDTHS,
  resolveLocalAssetPath,
  type MobileImageKind,
} from "@/lib/image-mobile-variant";
import { getSrxDB } from "@/lib/srx-db";
import { ensureMobileImageColumns, type MobileImageTable } from "@/lib/srx-mobile-image-columns";

type BackfillTarget = {
  kind: MobileImageKind;
  label: string;
  sourceColumn: string;
  table: MobileImageTable;
  targetColumn: string;
};

type ImageRow = RowDataPacket & {
  id: string;
  source_url: string | null;
  target_url: string | null;
};

type TargetSummary = {
  created: number;
  failed: number;
  label: string;
  missingSource: number;
  total: number;
  unchanged: number;
};

const TARGETS: readonly BackfillTarget[] = [
  {
    kind: "product",
    label: "Ảnh đại diện sản phẩm",
    sourceColumn: "thumbnail_url",
    table: "products",
    targetColumn: "thumbnail_url_mb",
  },
  {
    kind: "product",
    label: "Ảnh mô tả sản phẩm",
    sourceColumn: "info_img",
    table: "products",
    targetColumn: "info_img_mb",
  },
  {
    kind: "product",
    label: "Thư viện ảnh sản phẩm",
    sourceColumn: "image_url",
    table: "product_images",
    targetColumn: "image_url_mb",
  },
  {
    kind: "product",
    label: "Ảnh biến thể sản phẩm",
    sourceColumn: "image_url",
    table: "product_variants",
    targetColumn: "image_url_mb",
  },
  {
    kind: "banner",
    label: "Banner trang chủ",
    sourceColumn: "image_url",
    table: "banners",
    targetColumn: "image_url_mb",
  },
  {
    kind: "news",
    label: "Ảnh tin tức",
    sourceColumn: "featured_image_url",
    table: "posts",
    targetColumn: "featured_image_url_mb",
  },
  {
    kind: "productTag",
    label: "Từ điển thành phần",
    sourceColumn: "img",
    table: "product_tags",
    targetColumn: "img_mb",
  },
];

const isDryRun = process.argv.includes("--dry-run");
const isForced = process.argv.includes("--force");

function parseOnlyFilter(): Set<string> | null {
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const rawValue = onlyArg?.slice("--only=".length).trim();

  if (!rawValue) {
    return null;
  }

  return new Set(
    rawValue
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isSelected(target: BackfillTarget, filter: Set<string> | null): boolean {
  return filter === null || filter.has(target.table);
}

async function readRows(target: BackfillTarget): Promise<ImageRow[]> {
  const db = getSrxDB();
  // Tên bảng và tên cột lấy từ hằng số TARGETS trong file này, không đến từ input.
  const [rows] = await db.query<ImageRow[]>(`
    SELECT
      CAST(id AS CHAR) AS id,
      \`${target.sourceColumn}\` AS source_url,
      \`${target.targetColumn}\` AS target_url
    FROM \`${target.table}\`
    WHERE \`${target.sourceColumn}\` IS NOT NULL AND \`${target.sourceColumn}\` <> ''
  `);

  return rows;
}

/** Bản chạy thử chỉ kiểm tra file gốc có nằm trên máy này không, không resize. */
function planRow(row: ImageRow): "created" | "missingSource" | "unchanged" {
  const sourcePath = resolveLocalAssetPath(row.source_url);

  if (!sourcePath || !existsSync(sourcePath)) {
    return "missingSource";
  }

  const mobilePath = resolveLocalAssetPath(buildMobileImageUrl(String(row.source_url)));

  if (!isForced && row.target_url && mobilePath && existsSync(mobilePath)) {
    return "unchanged";
  }

  return "created";
}

async function applyRow(target: BackfillTarget, row: ImageRow): Promise<"created" | "missingSource" | "unchanged"> {
  const mobileImageUrl = await ensureMobileImageVariant(row.source_url, target.kind, { force: isForced });

  if (mobileImageUrl === row.target_url) {
    return mobileImageUrl ? "unchanged" : "missingSource";
  }

  const db = getSrxDB();
  // Tên bảng và tên cột lấy từ hằng số TARGETS trong file này, không đến từ input.
  await db.execute(`UPDATE \`${target.table}\` SET \`${target.targetColumn}\` = ? WHERE id = ?`, [
    mobileImageUrl,
    row.id,
  ]);

  return mobileImageUrl ? "created" : "missingSource";
}

async function runTarget(target: BackfillTarget): Promise<TargetSummary> {
  const summary: TargetSummary = {
    created: 0,
    failed: 0,
    label: target.label,
    missingSource: 0,
    total: 0,
    unchanged: 0,
  };

  await ensureMobileImageColumns(target.table);
  const rows = await readRows(target);
  summary.total = rows.length;

  for (const row of rows) {
    try {
      const outcome = isDryRun ? planRow(row) : await applyRow(target, row);
      summary[outcome] += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`  [${target.label}] id=${row.id} lỗi:`, error instanceof Error ? error.message : error);
    }
  }

  return summary;
}

function printSummary(summaries: readonly TargetSummary[]): void {
  console.log("");
  console.log(isDryRun ? "Kết quả chạy thử (không ghi gì):" : "Kết quả:");

  for (const summary of summaries) {
    console.log(
      `  ${summary.label}: ${summary.total} ảnh | tạo mới ${summary.created} | giữ nguyên ${summary.unchanged} | ` +
        `không có file gốc hoặc ảnh đã đủ nhỏ ${summary.missingSource} | lỗi ${summary.failed}`,
    );
  }

  const failedTotal = summaries.reduce((total, summary) => total + summary.failed, 0);

  if (failedTotal > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const filter = parseOnlyFilter();
  const targets = TARGETS.filter((target) => isSelected(target, filter));

  if (targets.length === 0) {
    console.error(
      "Không có bảng nào khớp với --only. Các giá trị hợp lệ:",
      [...new Set(TARGETS.map((t) => t.table))].join(", "),
    );
    process.exitCode = 1;
    return;
  }

  console.log("Chiều rộng bản mobile:", JSON.stringify(MOBILE_IMAGE_WIDTHS));
  console.log(isDryRun ? "Chế độ chạy thử." : "Bắt đầu tạo ảnh mobile...");

  const db = getSrxDB();
  const summaries: TargetSummary[] = [];

  try {
    for (const target of targets) {
      console.log(`- ${target.label} (${target.table}.${target.sourceColumn})`);
      summaries.push(await runTarget(target));
    }

    printSummary(summaries);
  } finally {
    await db.end().catch(() => undefined);
  }
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  await getSrxDB()
    .end()
    .catch(() => undefined);
  process.exit(1);
});
