"use client";

import * as React from "react";

import { MapEdgesLayer } from "./map-edges-layer";
import { isNodeDimmed, type MapFocusState } from "./map-focus";
import { GROUP_GEOMETRIES, LANE_HEADER_Y, MAP_NODES, WORLD_BOUNDS } from "./map-geometry";
import { LANE_PADDING, MAP_LANES, NODE_WIDTH } from "./map-layout";
import { MapNodeButton, type NodeVisual } from "./map-node";

/** Dải màu của từng làn; tên làn nằm ở hàng tiêu đề dính phía trên (map-lane-headers). */
function LaneBackgrounds() {
  const height = WORLD_BOUNDS.y + WORLD_BOUNDS.h - LANE_HEADER_Y;

  return (
    <>
      {MAP_LANES.map((lane) => (
        <div
          key={lane.id}
          className="absolute rounded-2xl"
          style={{
            left: lane.x - LANE_PADDING,
            top: LANE_HEADER_Y,
            width: NODE_WIDTH + LANE_PADDING * 2,
            height,
            background: `${lane.color}0d`,
          }}
        />
      ))}
    </>
  );
}

function GroupFrames() {
  return (
    <>
      {GROUP_GEOMETRIES.map((group) => (
        <div
          key={group.id}
          className="absolute rounded-2xl border border-dashed border-emerald-500/60 bg-emerald-500/6"
          style={{ left: group.x, top: group.y, width: group.w, height: group.h }}
        >
          <span className="absolute top-2 left-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {group.title}
          </span>
        </div>
      ))}
    </>
  );
}

function getNodeVisual(focus: MapFocusState, nodeId: string): NodeVisual {
  if (focus.inspectedNodeId === nodeId) return "inspected";
  return isNodeDimmed(focus, nodeId) ? "dimmed" : "normal";
}

/** Toàn bộ nội dung bản đồ theo toạ độ thế giới; không phụ thuộc mức zoom nên không vẽ lại khi kéo / phóng. */
export const MapWorld = React.memo(function MapWorld({
  focus,
  pinnedNodeId,
  hoveredEdgeId,
  onNodeEnter,
  onNodeLeave,
  onNodeSelect,
  onEdgeHover,
}: {
  focus: MapFocusState;
  pinnedNodeId: string | null;
  hoveredEdgeId: string | null;
  onNodeEnter: (nodeId: string) => void;
  onNodeLeave: () => void;
  onNodeSelect: (nodeId: string) => void;
  onEdgeHover: (edgeId: string | null) => void;
}) {
  return (
    <>
      <LaneBackgrounds />
      <GroupFrames />
      <MapEdgesLayer focus={focus} layer="base" hoveredEdgeId={hoveredEdgeId} onEdgeHover={onEdgeHover} />
      {MAP_NODES.map((node) => (
        <MapNodeButton
          key={node.id}
          node={node}
          visual={getNodeVisual(focus, node.id)}
          isPinned={pinnedNodeId === node.id}
          onEnter={onNodeEnter}
          onLeave={onNodeLeave}
          onSelect={onNodeSelect}
        />
      ))}
      <MapEdgesLayer focus={focus} layer="overlay" hoveredEdgeId={hoveredEdgeId} />
    </>
  );
});
