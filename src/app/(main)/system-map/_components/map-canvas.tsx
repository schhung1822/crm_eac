"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { MapZoomControls } from "./map-controls";
import { MapEdgeLabels } from "./map-edge-labels";
import { buildMapFocus } from "./map-focus";
import { NODE_BOXES, NODE_BY_ID, WORLD_BOUNDS, type Box } from "./map-geometry";
import { MapLaneHeaders } from "./map-lane-headers";
import { MapNodeDetails, type ScreenRect } from "./map-node-details";
import type { MapFlow } from "./map-types";
import { MapWorld } from "./map-world";
import { useMapViewport, type ViewTransform } from "./use-map-viewport";

export interface MapFocusRequest {
  box: Box;
  nonce: number;
  /** Có node thì đưa node vào giữa màn hình, không thì thu phóng vừa khung. */
  nodeId?: string;
}

const HIDE_DELAY_MS = 180;
const GRID_SIZE = 24;

function useFullscreen(containerRef: React.RefObject<HTMLDivElement | null>, onChange: () => void) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      requestAnimationFrame(onChange);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [containerRef, onChange]);

  const toggle = React.useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }, [containerRef]);

  return { isFullscreen, toggle };
}

/** Thẻ thông tin tắt sau một khoảng trễ ngắn để kịp di chuột từ node sang thẻ. */
function useDelayedHover() {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const scheduleHide = React.useCallback(() => {
    cancelHide();
    timer.current = setTimeout(() => setHoveredId(null), HIDE_DELAY_MS);
  }, [cancelHide]);

  const show = React.useCallback(
    (id: string) => {
      cancelHide();
      setHoveredId(id);
    },
    [cancelHide],
  );

  React.useEffect(() => cancelHide, [cancelHide]);

  return { hoveredId, show, cancelHide, scheduleHide };
}

function toScreenRect(transform: ViewTransform | null, box: Box | undefined): ScreenRect | null {
  if (!transform || !box) return null;

  return {
    left: transform.x + box.x * transform.k,
    top: transform.y + box.y * transform.k,
    right: transform.x + (box.x + box.w) * transform.k,
  };
}

function gridStyle(transform: ViewTransform | null): React.CSSProperties {
  const size = GRID_SIZE * (transform?.k ?? 1);

  return {
    backgroundImage: "radial-gradient(circle, var(--border) 1.2px, transparent 1.2px)",
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `${transform?.x ?? 0}px ${transform?.y ?? 0}px`,
  };
}

function getInspectedCard(transform: ViewTransform | null, nodeId: string | null) {
  const node = nodeId ? NODE_BY_ID.get(nodeId) : undefined;
  const anchor = toScreenRect(transform, node ? NODE_BOXES.get(node.id) : undefined);

  return node && anchor ? { node, anchor } : null;
}

function getContainerClassName(isFullscreen: boolean): string {
  return cn(
    "bg-background relative overflow-hidden",
    isFullscreen ? "h-screen w-screen" : "h-[calc(100svh-15rem)] min-h-[560px] rounded-xl border",
  );
}

/** Lớp chứa toàn bộ bản đồ, dịch chuyển và co giãn theo transform hiện tại. */
function WorldLayer({
  transform,
  isAnimating,
  children,
}: {
  transform: ViewTransform | null;
  isAnimating: boolean;
  children: (zoom: number) => React.ReactNode;
}) {
  if (!transform) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 origin-top-left",
        isAnimating && "transition-transform duration-500 ease-out",
      )}
      style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
    >
      {children(transform.k)}
    </div>
  );
}

export function MapCanvas({
  activeFlow,
  emphasizedEdgeIds,
  focusRequest,
  pinnedNodeId,
  onPinnedNodeChange,
}: {
  activeFlow: MapFlow | null;
  emphasizedEdgeIds: ReadonlySet<string> | null;
  focusRequest: MapFocusRequest | null;
  pinnedNodeId: string | null;
  onPinnedNodeChange: (nodeId: string | null) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const viewport = useMapViewport(viewportRef, WORLD_BOUNDS);
  const { fitBox, centerOnBox, wasDragged, zoomAt, transform } = viewport;
  const hover = useDelayedHover();
  const [hoveredEdgeId, setHoveredEdgeId] = React.useState<string | null>(null);
  const fitWorld = React.useCallback(() => fitBox(WORLD_BOUNDS), [fitBox]);
  const fullscreen = useFullscreen(containerRef, fitWorld);

  const inspectedNodeId = pinnedNodeId ?? hover.hoveredId;
  const inspected = getInspectedCard(transform, inspectedNodeId);

  const focus = React.useMemo(
    () => buildMapFocus(activeFlow, inspectedNodeId, emphasizedEdgeIds),
    [activeFlow, inspectedNodeId, emphasizedEdgeIds],
  );

  React.useEffect(() => {
    if (!focusRequest) return;

    if (focusRequest.nodeId) {
      centerOnBox(focusRequest.box);
    } else {
      fitBox(focusRequest.box, { maxZoom: 1 });
    }
  }, [centerOnBox, fitBox, focusRequest]);

  const handleNodeSelect = React.useCallback(
    (nodeId: string) => {
      if (wasDragged()) return;
      onPinnedNodeChange(pinnedNodeId === nodeId ? null : nodeId);
    },
    [onPinnedNodeChange, pinnedNodeId, wasDragged],
  );

  const jumpToNode = React.useCallback(
    (nodeId: string) => {
      const box = NODE_BOXES.get(nodeId);

      onPinnedNodeChange(nodeId);
      if (box) centerOnBox(box);
    },
    [centerOnBox, onPinnedNodeChange],
  );

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;

    if (wasDragged() || target?.closest("[data-map-node], [data-map-overlay]")) return;
    onPinnedNodeChange(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onPinnedNodeChange(null);
      return;
    }

    viewport.viewportHandlers.onKeyDown(event);
  };

  return (
    <div ref={containerRef} className={getContainerClassName(fullscreen.isFullscreen)}>
      <div
        ref={viewportRef}
        tabIndex={0}
        aria-label="Sơ đồ hệ thống. Kéo để di chuyển, cuộn chuột để phóng to, phím 0 để xem toàn bộ."
        className={cn(
          "focus-visible:ring-ring absolute inset-0 touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-inset",
          viewport.isPanning ? "cursor-grabbing" : "cursor-grab",
        )}
        style={gridStyle(transform)}
        {...viewport.viewportHandlers}
        onKeyDown={handleKeyDown}
        onClick={handleBackgroundClick}
      >
        <WorldLayer transform={transform} isAnimating={viewport.isAnimating}>
          {(zoom) => (
            <>
              <MapWorld
                focus={focus}
                pinnedNodeId={pinnedNodeId}
                hoveredEdgeId={hoveredEdgeId}
                onNodeEnter={hover.show}
                onNodeLeave={hover.scheduleHide}
                onNodeSelect={handleNodeSelect}
                onEdgeHover={setHoveredEdgeId}
              />
              <MapEdgeLabels
                focus={focus}
                hoveredEdgeId={hoveredEdgeId}
                zoom={zoom}
                isAnimating={viewport.isAnimating}
              />
            </>
          )}
        </WorldLayer>
        {inspected ? (
          <MapNodeDetails
            node={inspected.node}
            anchor={inspected.anchor}
            viewport={viewport.viewportSize}
            isPinned={pinnedNodeId === inspected.node.id}
            onClose={() => onPinnedNodeChange(null)}
            onSelectNode={jumpToNode}
            onPointerEnter={hover.cancelHide}
            onPointerLeave={hover.scheduleHide}
          />
        ) : null}
      </div>
      <MapZoomControls
        zoom={transform?.k ?? 1}
        isFullscreen={fullscreen.isFullscreen}
        onZoomIn={() => zoomAt(1.25, undefined, true)}
        onZoomOut={() => zoomAt(0.8, undefined, true)}
        onFit={fitWorld}
        onToggleFullscreen={fullscreen.toggle}
      />
      <MapLaneHeaders transform={transform} isAnimating={viewport.isAnimating} />
    </div>
  );
}
