"use client";

import { cn } from "@/lib/utils";

import { LANE_PADDING, MAP_LANES, NODE_WIDTH } from "./map-layout";
import type { MapLane } from "./map-types";
import type { ViewTransform } from "./use-map-viewport";

const FULL_TITLE_MIN_WIDTH = 170;
const SHORT_TITLE_MIN_WIDTH = 80;
const HINT_MIN_WIDTH = 210;

function getLaneLabel(lane: MapLane, index: number, laneWidth: number): string {
  if (laneWidth >= FULL_TITLE_MIN_WIDTH) return lane.title;
  return laneWidth >= SHORT_TITLE_MIN_WIDTH ? lane.short : String(index + 1);
}

/** Hàng tiêu đề làn dính ở mép trên, chạy theo khi kéo ngang và luôn giữ cỡ chữ đọc được. */
export function MapLaneHeaders({ transform, isAnimating }: { transform: ViewTransform | null; isAnimating: boolean }) {
  if (!transform) return null;

  const laneWidth = (NODE_WIDTH + LANE_PADDING * 2) * transform.k;

  return (
    <div className="bg-background/85 pointer-events-none absolute inset-x-0 top-0 z-5 h-11 overflow-hidden border-b backdrop-blur">
      {MAP_LANES.map((lane, index) => (
        <div
          key={lane.id}
          className={cn(
            "absolute inset-y-0 flex flex-col justify-center overflow-hidden px-2",
            isAnimating && "transition-[left,width] duration-500 ease-out",
          )}
          style={{ left: transform.x + (lane.x - LANE_PADDING) * transform.k, width: laneWidth }}
        >
          <div className="truncate text-xs leading-4 font-semibold" style={{ color: lane.color }}>
            {getLaneLabel(lane, index, laneWidth)}
          </div>
          {laneWidth >= HINT_MIN_WIDTH ? (
            <div className="text-muted-foreground truncate text-[11px] leading-4">{lane.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
