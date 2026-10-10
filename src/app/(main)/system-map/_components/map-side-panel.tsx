"use client";

import type { ReactNode } from "react";

import { Hand, MousePointerClick, Route, TriangleAlert, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MapLegend } from "./map-controls";
import { MAP_NODES } from "./map-geometry";
import { MAP_LANES } from "./map-layout";
import type { MapFlow } from "./map-types";

const PANEL_CLASS =
  "bg-card nice-scroll flex flex-col overflow-y-auto rounded-xl border xl:h-[calc(100svh-15rem)] xl:min-h-[560px]";

const TIPS = [
  { icon: MousePointerClick, text: "Rê chuột vào một ô để xem nhanh; bấm vào ô để ghim thẻ và mở liên kết." },
  { icon: ZoomIn, text: "Cuộn chuột hoặc chụm 2 ngón để phóng to / thu nhỏ; phím 0 để xem toàn bộ." },
  { icon: Hand, text: "Kéo nền để di chuyển. Nút ở góc phải có chế độ toàn màn hình để trình chiếu." },
  { icon: Route, text: "Chọn một luồng ở thanh phía trên để xem dữ liệu đi qua từng bước." },
];

const NODES_WITH_NOTES = MAP_NODES.filter((node) => node.note);

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{children}</h2>;
}

function OverviewPanel({ onFocusNode }: { onFocusNode: (nodeId: string) => void }) {
  return (
    <div className="space-y-6 p-4">
      <section>
        <SectionTitle>Cách xem sơ đồ</SectionTitle>
        <ul className="space-y-2.5 text-sm leading-5">
          {TIPS.map((tip) => (
            <li key={tip.text} className="flex gap-2.5">
              <tip.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Điểm cần lưu ý</SectionTitle>
        <ul className="space-y-2">
          {NODES_WITH_NOTES.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onFocusNode(node.id)}
                className="hover:bg-accent w-full rounded-lg border p-3 text-left transition-colors"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <TriangleAlert className="size-3.5 shrink-0 text-amber-500" />
                  {node.title}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-5">{node.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Ký hiệu</SectionTitle>
        <MapLegend />
      </section>

      <section>
        <SectionTitle>Dữ liệu đi qua 8 làn</SectionTitle>
        <ul className="space-y-2 text-sm">
          {MAP_LANES.map((lane) => (
            <li key={lane.id} className="flex items-start gap-2.5">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: lane.color }} />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{lane.title}</span>
                <span className="text-muted-foreground block text-xs">{lane.hint}</span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {MAP_NODES.filter((node) => node.lane === lane.id).length}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FlowPanel({
  flow,
  hoveredStep,
  onStepHover,
  onStepFocus,
  onClose,
}: {
  flow: MapFlow;
  hoveredStep: number | null;
  onStepHover: (index: number | null) => void;
  onStepFocus: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="bg-card sticky top-0 z-10 border-b p-4" style={{ borderTop: `3px solid ${flow.color}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: flow.color }}>
              Luồng dữ liệu
            </div>
            <h2 className="text-lg leading-6 font-semibold">{flow.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Bỏ chọn luồng">
            <X />
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-5">{flow.summary}</p>
      </div>
      <ol className="space-y-1 p-3" onMouseLeave={() => onStepHover(null)}>
        {flow.steps.map((step, index) => (
          <li key={step.text}>
            <button
              type="button"
              onMouseEnter={() => onStepHover(index)}
              onFocus={() => onStepHover(index)}
              onClick={() => onStepFocus(index)}
              className={cn(
                "flex w-full gap-3 rounded-lg p-2.5 text-left text-sm leading-5 transition-colors",
                hoveredStep === index ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: flow.color }}
              >
                {index + 1}
              </span>
              <span>{step.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground px-4 pb-4 text-xs leading-5">
        Rê chuột vào một bước để làm nổi bật đường đi tương ứng; bấm để phóng tới đoạn đó trên sơ đồ.
      </p>
    </div>
  );
}

export function MapSidePanel({
  activeFlow,
  hoveredStep,
  onStepHover,
  onStepFocus,
  onCloseFlow,
  onFocusNode,
}: {
  activeFlow: MapFlow | null;
  hoveredStep: number | null;
  onStepHover: (index: number | null) => void;
  onStepFocus: (index: number) => void;
  onCloseFlow: () => void;
  onFocusNode: (nodeId: string) => void;
}) {
  return (
    <aside className={PANEL_CLASS}>
      {activeFlow ? (
        <FlowPanel
          flow={activeFlow}
          hoveredStep={hoveredStep}
          onStepHover={onStepHover}
          onStepFocus={onStepFocus}
          onClose={onCloseFlow}
        />
      ) : (
        <OverviewPanel onFocusNode={onFocusNode} />
      )}
    </aside>
  );
}
