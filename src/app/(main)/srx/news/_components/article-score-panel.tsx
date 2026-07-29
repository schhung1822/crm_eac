"use client";

import * as React from "react";

import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ScoreCheck = {
  id: string;
  label: string;
  weight: number;
  state: "pass" | "warn" | "fail";
  detail?: string;
};

export type ArticleScore = {
  seo: number;
  aeo: number;
  geo: number;
  overall: number;
  suggestions: string[];
  checks?: { seo: ScoreCheck[]; aeo: ScoreCheck[]; geo: ScoreCheck[] };
};

const AXES = [
  { key: "seo" as const, label: "SEO", hint: "Thứ hạng tìm kiếm truyền thống" },
  { key: "aeo" as const, label: "AEO", hint: "Được chọn làm câu trả lời trực tiếp" },
  { key: "geo" as const, label: "GEO", hint: "Được AI trích dẫn" },
];

function toneFor(score: number) {
  if (score >= 85) {
    return { ring: "text-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Tốt" };
  }

  if (score >= 65) {
    return { ring: "text-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Khá" };
  }

  return { ring: "text-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Cần cải thiện" };
}

/** Vòng tròn tiến độ vẽ bằng SVG, không cần thư viện chart. */
function ScoreRing({ score, size = 76 }: { score: number; size?: number }) {
  const stroke = size >= 70 ? 7 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = toneFor(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="text-muted/30"
          stroke="currentColor"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className={cn("transition-[stroke-dashoffset] duration-700", tone.ring)}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("leading-none font-semibold", size >= 70 ? "text-xl" : "text-sm", tone.text)}>{score}</span>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: ScoreCheck }) {
  const Icon = check.state === "pass" ? CheckCircle2 : check.state === "warn" ? AlertTriangle : XCircle;
  const color =
    check.state === "pass" ? "text-emerald-500" : check.state === "warn" ? "text-amber-500" : "text-rose-500";

  return (
    <li className="flex items-start gap-2 py-1.5 text-sm">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      <span className={cn("min-w-0 flex-1", check.state === "pass" && "text-muted-foreground")}>{check.label}</span>
      {check.detail ? <span className="text-muted-foreground shrink-0 text-xs">{check.detail}</span> : null}
    </li>
  );
}

function AxisSection({
  label,
  hint,
  score,
  checks,
}: {
  label: string;
  hint: string;
  score: number;
  checks: ScoreCheck[];
}) {
  const [open, setOpen] = React.useState(false);
  const failing = checks.filter((check) => check.state !== "pass").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent/40 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
        >
          <ScoreRing score={score} size={44} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-medium">
              {label}
              {failing > 0 ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal">
                  {failing} việc
                </Badge>
              ) : null}
            </span>
            <span className="text-muted-foreground block truncate text-xs">{hint}</span>
          </span>
          <ChevronDown className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="divide-y px-2 pb-2">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ArticleScorePanel({
  score,
  isScoring,
  onRescore,
}: {
  score: ArticleScore | null;
  isScoring: boolean;
  onRescore: () => void;
}) {
  if (!score) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">Chấm điểm để xem bài đã chuẩn SEO / AEO / GEO tới đâu.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={onRescore} disabled={isScoring}>
          {isScoring ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Chấm điểm bài viết
        </Button>
      </div>
    );
  }

  const tone = toneFor(score.overall);
  const todo = score.suggestions.slice(0, 5);

  return (
    <div className="grid gap-3">
      <div className="bg-muted/20 flex items-center gap-4 rounded-xl border p-4">
        <ScoreRing score={score.overall} />
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold", tone.text)}>{tone.label}</div>
          <p className="text-muted-foreground text-xs leading-5">
            Điểm tổng của ba trục. Chấm bằng bộ tiêu chí cố định nên không tốn token AI.
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onRescore} disabled={isScoring} title="Chấm lại">
          {isScoring ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          <span className="sr-only">Chấm lại</span>
        </Button>
      </div>

      <div className="rounded-xl border">
        {AXES.map((axis) => (
          <AxisSection
            key={axis.key}
            label={axis.label}
            hint={axis.hint}
            score={score[axis.key]}
            checks={score.checks?.[axis.key] ?? []}
          />
        ))}
      </div>

      {todo.length > 0 ? (
        <div className="rounded-xl border p-4">
          <div className="mb-2 text-sm font-medium">Ưu tiên sửa</div>
          <ol className="grid gap-1.5">
            {todo.map((item, index) => (
              <li key={item} className="text-muted-foreground flex gap-2 text-sm">
                <span className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium">
                  {index + 1}
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
