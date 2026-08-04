import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground max-w-3xl leading-7">{description}</p> : null}
      </div>
      <div className="text-foreground/90 space-y-5 leading-7">{children}</div>
    </section>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="nice-scroll overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-border border-b px-4 py-3 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="hover:bg-muted/30">
              {row.map((cell, cellIndex) => (
                <td key={`row-${rowIndex}-cell-${cellIndex}`} className="border-border border-t px-4 py-3 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Đường dẫn trang trong CRM, dùng trong bảng bản đồ chức năng. */
export function Path({ children }: { children: string }) {
  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">{children}</code>;
}

export function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={`step-${index}`} className="flex gap-3">
          <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 pt-0.5 text-sm leading-6">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function HowTo({
  title,
  path,
  role,
  steps,
  note,
}: {
  title: string;
  path: string;
  role: string;
  steps: ReactNode[];
  note?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-2 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Path>{path}</Path>
          <Badge variant="outline" className="text-[11px] font-normal">
            {role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StepList steps={steps} />
        {note ? (
          <p className="text-muted-foreground border-l-2 border-amber-400 pl-3 text-xs leading-5">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning";
  title: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
      : "border-border bg-muted/40";

  return (
    <div className={`rounded-xl border p-4 text-sm leading-6 ${toneClass}`}>
      <div className="mb-1 font-semibold">{title}</div>
      <div>{children}</div>
    </div>
  );
}
