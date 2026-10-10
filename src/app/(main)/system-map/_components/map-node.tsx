"use client";

import * as React from "react";

import { ArrowUpRight, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import { NODE_BOXES, type Box } from "./map-geometry";
import { MapIcon } from "./map-icon";
import { LANE_BY_ID } from "./map-layout";
import type { MapNode } from "./map-types";

export type NodeVisual = "normal" | "dimmed" | "inspected";

function getNodeStyle(box: Box, color: string, isInspected: boolean, isExternal: boolean): React.CSSProperties {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    borderColor: isInspected || isExternal ? color : undefined,
    boxShadow: isInspected ? `0 0 0 3px ${color}40, 0 12px 28px -14px ${color}` : undefined,
    zIndex: isInspected ? 1 : undefined,
  };
}

function NodeCornerIcons({ node }: { node: MapNode }) {
  return (
    <span aria-hidden className="absolute top-2 right-2 flex items-center gap-1">
      {node.note ? <TriangleAlert className="size-3.5 text-amber-500" /> : null}
      {node.links?.length ? <ArrowUpRight className="text-muted-foreground size-3.5" /> : null}
    </span>
  );
}

export const MapNodeButton = React.memo(function MapNodeButton({
  node,
  visual,
  isPinned,
  onEnter,
  onLeave,
  onSelect,
}: {
  node: MapNode;
  visual: NodeVisual;
  isPinned: boolean;
  onEnter: (nodeId: string) => void;
  onLeave: () => void;
  onSelect: (nodeId: string) => void;
}) {
  const box = NODE_BOXES.get(node.id);
  const color = LANE_BY_ID.get(node.lane)?.color ?? "#64748b";

  if (!box) return null;

  return (
    <button
      type="button"
      data-map-node={node.id}
      aria-pressed={isPinned}
      aria-label={`${node.title} – ${node.subtitle}`}
      className={cn(
        "bg-card text-card-foreground focus-visible:ring-ring absolute flex items-center gap-3 overflow-hidden rounded-xl border py-2 pr-3 pl-4 text-left shadow-xs transition-[opacity,box-shadow,border-color] duration-200 outline-none focus-visible:ring-2",
        node.external && "border-dashed",
        visual === "dimmed" && "opacity-25",
      )}
      style={getNodeStyle(box, color, visual === "inspected", Boolean(node.external))}
      onMouseEnter={() => onEnter(node.id)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(node.id)}
      onBlur={onLeave}
      onClick={() => onSelect(node.id)}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}1f` }}
      >
        <MapIcon icon={node.icon} color={color} />
      </span>
      <span className="min-w-0 flex-1 pr-3">
        <span className="block truncate text-[14px] leading-5 font-semibold">{node.title}</span>
        <span className="text-muted-foreground block truncate text-xs leading-4">{node.subtitle}</span>
      </span>
      <NodeCornerIcons node={node} />
    </button>
  );
});
