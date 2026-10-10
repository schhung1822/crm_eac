"use client";

import * as React from "react";

import { getEdgeColor, getEdgeVisual, MUTED_EDGE_COLOR, type EdgeVisual, type MapFocusState } from "./map-focus";
import { EDGE_GEOMETRIES, MAP_FLOWS, WORLD_BOUNDS, type EdgeGeometry } from "./map-geometry";
import { MAP_LANES } from "./map-layout";
import type { EdgeKind } from "./map-types";

type EdgeLayer = "base" | "overlay";

interface StrokeStyle {
  width: number;
  opacity: number;
}

const DASH_BY_KIND = new Map<EdgeKind, string>([
  ["fallback", "7 5"],
  ["inferred", "7 5"],
  ["read", "1 6"],
]);

const STROKE_BY_VISUAL = new Map<EdgeVisual, StrokeStyle>([
  ["normal", { width: 1.5, opacity: 0.5 }],
  ["flow", { width: 2.6, opacity: 0.95 }],
  ["flow-dim", { width: 2, opacity: 0.3 }],
  ["emphasis", { width: 3, opacity: 1 }],
  ["faded", { width: 1.2, opacity: 0.1 }],
]);

const MARKER_COLORS = [
  ...new Set([MUTED_EDGE_COLOR, ...MAP_FLOWS.map((flow) => flow.color), ...MAP_LANES.map((lane) => lane.color)]),
];
const MARKER_INDEX = new Map(MARKER_COLORS.map((color, index) => [color, index]));
const ANIMATED_VISUALS = new Set<EdgeVisual>(["flow", "emphasis"]);

const DASH_KEYFRAMES = `
@keyframes system-map-dash { to { stroke-dashoffset: -28; } }
.system-map-dots { animation: system-map-dash 1.1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .system-map-dots { animation: none; } }
`;

function markerId(layer: EdgeLayer, color: string): string {
  return `system-map-arrow-${layer}-${MARKER_INDEX.get(color) ?? 0}`;
}

function EdgePath({
  geometry,
  layer,
  visual,
  color,
  isHovered,
  onHover,
}: {
  geometry: EdgeGeometry;
  layer: EdgeLayer;
  visual: EdgeVisual;
  color: string;
  isHovered: boolean;
  onHover?: (edgeId: string | null) => void;
}) {
  const stroke = STROKE_BY_VISUAL.get(visual) ?? { width: 1.5, opacity: 0.5 };
  const dash = DASH_BY_KIND.get(geometry.edge.kind ?? "main");
  const width = isHovered ? stroke.width + 1.2 : stroke.width;

  return (
    <g>
      <path
        d={geometry.path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeOpacity={isHovered ? 1 : stroke.opacity}
        strokeDasharray={dash}
        strokeLinecap="round"
        markerEnd={`url(#${markerId(layer, color)})`}
        className="transition-[stroke-opacity,stroke-width] duration-200"
      />
      {ANIMATED_VISUALS.has(visual) ? (
        <path
          d={geometry.path}
          fill="none"
          stroke={color}
          strokeWidth={width + 2.5}
          strokeDasharray="0.1 13.9"
          strokeLinecap="round"
          className="system-map-dots"
        />
      ) : null}
      {onHover ? (
        <path
          d={geometry.path}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          pointerEvents="stroke"
          onMouseEnter={() => onHover(geometry.edge.id)}
          onMouseLeave={() => onHover(null)}
        />
      ) : null}
    </g>
  );
}

/**
 * Lớp "base" vẽ mọi cạnh phía sau node. Lớp "overlay" vẽ lại các cạnh đang được xem phía trên node,
 * để đường đi không bị che khi băng qua các ô khác.
 */
export const MapEdgesLayer = React.memo(function MapEdgesLayer({
  focus,
  layer,
  hoveredEdgeId,
  onEdgeHover,
}: {
  focus: MapFocusState;
  layer: EdgeLayer;
  hoveredEdgeId: string | null;
  onEdgeHover?: (edgeId: string | null) => void;
}) {
  const geometries =
    layer === "base"
      ? EDGE_GEOMETRIES
      : EDGE_GEOMETRIES.filter(
          (geometry) => geometry.edge.id === hoveredEdgeId || getEdgeVisual(focus, geometry.edge.id) === "emphasis",
        );

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute overflow-visible"
      style={{ left: WORLD_BOUNDS.x, top: WORLD_BOUNDS.y, width: WORLD_BOUNDS.w, height: WORLD_BOUNDS.h }}
      viewBox={`${WORLD_BOUNDS.x} ${WORLD_BOUNDS.y} ${WORLD_BOUNDS.w} ${WORLD_BOUNDS.h}`}
    >
      <defs>
        {layer === "base" ? <style>{DASH_KEYFRAMES}</style> : null}
        {MARKER_COLORS.map((color) => (
          <marker
            key={color}
            id={markerId(layer, color)}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="9"
            markerHeight="9"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: color }} />
          </marker>
        ))}
      </defs>
      {geometries.map((geometry) => {
        // Cạnh đang được xem đã có bản vẽ đậm ở lớp overlay, lớp base chỉ giữ vùng bắt chuột.
        const baseVisual = getEdgeVisual(focus, geometry.edge.id);
        const visual = layer === "overlay" ? "emphasis" : baseVisual === "emphasis" ? "faded" : baseVisual;

        return (
          <EdgePath
            key={geometry.edge.id}
            geometry={geometry}
            layer={layer}
            visual={visual}
            color={getEdgeColor(focus, geometry.edge.id, visual)}
            isHovered={layer === "overlay" && geometry.edge.id === hoveredEdgeId}
            onHover={onEdgeHover}
          />
        );
      })}
    </svg>
  );
});
