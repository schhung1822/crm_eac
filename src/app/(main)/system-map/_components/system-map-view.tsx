"use client";

import * as React from "react";

import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { MapCanvas, type MapFocusRequest } from "./map-canvas";
import {
  getBoundsOf,
  getEdgeNodeIds,
  MAP_EDGES,
  MAP_FLOWS,
  MAP_NODES,
  NODE_BOXES,
  WORLD_BOUNDS,
  type Box,
} from "./map-geometry";
import { MapSidePanel } from "./map-side-panel";

const FLOW_BOUNDS_PADDING = 40;

function padBox(box: Box): Box {
  return {
    x: box.x - FLOW_BOUNDS_PADDING,
    y: box.y - FLOW_BOUNDS_PADDING,
    w: box.w + FLOW_BOUNDS_PADDING * 2,
    h: box.h + FLOW_BOUNDS_PADDING * 2,
  };
}

function FlowChip({
  label,
  color,
  isActive,
  onClick,
}: {
  label: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors",
        isActive ? "text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
      style={isActive ? { borderColor: color, background: color ? `${color}1a` : undefined } : undefined}
    >
      {color ? <span className="size-2 rounded-full" style={{ background: color }} /> : null}
      {label}
    </button>
  );
}

export function SystemMapView() {
  const [activeFlowId, setActiveFlowId] = React.useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = React.useState<number | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = React.useState<string | null>(null);
  const [focusRequest, setFocusRequest] = React.useState<MapFocusRequest | null>(null);

  const activeFlow = MAP_FLOWS.find((flow) => flow.id === activeFlowId) ?? null;
  const hoveredStepEdges = hoveredStep === null ? undefined : activeFlow?.steps.at(hoveredStep)?.edges;

  const emphasizedEdgeIds = React.useMemo(
    () => (hoveredStepEdges ? new Set(hoveredStepEdges) : null),
    [hoveredStepEdges],
  );

  const requestFocus = (box: Box | null, nodeId?: string) => {
    if (box) {
      setFocusRequest({ box, nodeId, nonce: Date.now() });
    }
  };

  const selectFlow = (flowId: string | null) => {
    const flow = MAP_FLOWS.find((item) => item.id === flowId) ?? null;

    setActiveFlowId(flow?.id ?? null);
    setHoveredStep(null);
    setPinnedNodeId(null);

    const bounds = flow ? getBoundsOf(getEdgeNodeIds(flow.steps.flatMap((step) => step.edges))) : null;
    requestFocus(bounds ? padBox(bounds) : WORLD_BOUNDS);
  };

  const focusStep = (index: number) => {
    const step = activeFlow?.steps.at(index);
    const bounds = step ? getBoundsOf(getEdgeNodeIds(step.edges)) : null;

    requestFocus(bounds ? padBox(bounds) : null);
  };

  const focusNode = (nodeId: string) => {
    setPinnedNodeId(nodeId);
    requestFocus(NODE_BOXES.get(nodeId) ?? null, nodeId);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Sơ đồ hoạt động hệ thống</h1>
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" />
              Chỉ admin
            </Badge>
          </div>
        </div>
        <div className="text-muted-foreground flex shrink-0 gap-4 text-sm">
          <span>
            <b className="text-foreground tabular-nums">{MAP_NODES.length}</b> thành phần
          </span>
          <span>
            <b className="text-foreground tabular-nums">{MAP_EDGES.length}</b> kết nối
          </span>
          <span>
            <b className="text-foreground tabular-nums">{MAP_FLOWS.length}</b> luồng
          </span>
        </div>
      </header>

      <nav aria-label="Chọn luồng dữ liệu" className="nice-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <FlowChip label="Toàn bộ hệ thống" isActive={!activeFlow} onClick={() => selectFlow(null)} />
        {MAP_FLOWS.map((flow) => (
          <FlowChip
            key={flow.id}
            label={flow.title}
            color={flow.color}
            isActive={activeFlow?.id === flow.id}
            onClick={() => selectFlow(activeFlow?.id === flow.id ? null : flow.id)}
          />
        ))}
      </nav>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <MapCanvas
          activeFlow={activeFlow}
          emphasizedEdgeIds={emphasizedEdgeIds}
          focusRequest={focusRequest}
          pinnedNodeId={pinnedNodeId}
          onPinnedNodeChange={setPinnedNodeId}
        />
        <MapSidePanel
          activeFlow={activeFlow}
          hoveredStep={hoveredStep}
          onStepHover={setHoveredStep}
          onStepFocus={focusStep}
          onCloseFlow={() => selectFlow(null)}
          onFocusNode={focusNode}
        />
      </div>
    </div>
  );
}
