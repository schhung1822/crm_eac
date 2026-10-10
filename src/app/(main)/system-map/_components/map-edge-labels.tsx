"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { getEdgeColor, getEdgeVisual, type MapFocusState } from "./map-focus";
import { EDGE_GEOMETRIES, type Point } from "./map-geometry";
import { placeEdgeLabels } from "./map-label-layout";

function ScaledMarker({
  point,
  counterScale,
  isAnimating,
  dimmed = false,
  children,
}: {
  point: Point;
  counterScale: number;
  isAnimating: boolean;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("absolute w-max", isAnimating && "transition-transform duration-500 ease-out")}
      style={{
        left: point.x,
        top: point.y,
        transform: `translate(-50%, -50%) scale(${counterScale})`,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Số bước của luồng đang chọn (giữa mỗi đường) và nhãn dữ liệu của cạnh đang trỏ tới / bước đang trỏ tới.
 * Khi thu nhỏ bản đồ, chúng được phóng ngược lại để vẫn đọc được trên màn hình.
 */
export const MapEdgeLabels = React.memo(function MapEdgeLabels({
  focus,
  hoveredEdgeId,
  zoom,
  isAnimating,
}: {
  focus: MapFocusState;
  hoveredEdgeId: string | null;
  zoom: number;
  isAnimating: boolean;
}) {
  const counterScale = 1 / Math.min(zoom, 1);

  const badges = EDGE_GEOMETRIES.flatMap((geometry) => {
    const visual = getEdgeVisual(focus, geometry.edge.id);
    const step = focus.stepByEdge.get(geometry.edge.id);
    return step === undefined || visual === "faded" ? [] : [{ geometry, step, dimmed: visual === "flow-dim" }];
  });

  const labels = React.useMemo(() => {
    const visible = EDGE_GEOMETRIES.filter(
      (geometry) =>
        geometry.edge.id === hoveredEdgeId ||
        (focus.focusSource === "step" && getEdgeVisual(focus, geometry.edge.id) === "emphasis"),
    );
    return placeEdgeLabels(visible, counterScale);
  }, [counterScale, focus, hoveredEdgeId]);

  return (
    <div className="pointer-events-none absolute top-0 left-0">
      {badges.map(({ geometry, step, dimmed }) => (
        <ScaledMarker
          key={geometry.edge.id}
          point={geometry.mid}
          counterScale={counterScale}
          isAnimating={isAnimating}
          dimmed={dimmed}
        >
          <span
            className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-white dark:ring-neutral-900"
            style={{ background: focus.flow?.color }}
          >
            {step}
          </span>
        </ScaledMarker>
      ))}
      {labels.map((label) => (
        <ScaledMarker key={label.geometry.edge.id} point={label} counterScale={counterScale} isAnimating={isAnimating}>
          <span
            className="bg-background/95 text-foreground block max-w-60 rounded-md border px-2 py-1 text-center text-xs leading-4 font-medium shadow-sm"
            style={{ borderColor: getEdgeColor(focus, label.geometry.edge.id, "emphasis") }}
          >
            {label.geometry.edge.label}
          </span>
        </ScaledMarker>
      ))}
    </div>
  );
});
