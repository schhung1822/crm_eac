"use client";

import type { ReactNode } from "react";

import { Maximize, Minimize, Scan, TriangleAlert, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

export function MapZoomControls({
  zoom,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
}: {
  zoom: number;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div
      data-map-overlay=""
      className="bg-background/90 absolute right-3 bottom-3 z-10 flex flex-col items-center gap-0.5 rounded-lg border p-1 shadow-sm backdrop-blur"
    >
      <ControlButton label="Phóng to (+)" onClick={onZoomIn}>
        <ZoomIn />
      </ControlButton>
      <span className="text-muted-foreground py-0.5 text-[11px] font-medium tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <ControlButton label="Thu nhỏ (−)" onClick={onZoomOut}>
        <ZoomOut />
      </ControlButton>
      <ControlButton label="Xem toàn bộ (0)" onClick={onFit}>
        <Scan />
      </ControlButton>
      <ControlButton label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize /> : <Maximize />}
      </ControlButton>
    </div>
  );
}

function LegendLine({ dash, label }: { dash?: string; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <svg width="28" height="8" aria-hidden className="text-muted-foreground shrink-0">
        <line
          x1="1"
          y1="4"
          x2="27"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <span>{label}</span>
    </li>
  );
}

export function MapLegend() {
  return (
    <ul className="space-y-2 text-sm">
      <LegendLine label="Luồng dữ liệu chính (mũi tên chỉ hướng đi)" />
      <LegendLine dash="1 5" label="Đọc dữ liệu để hiển thị" />
      <LegendLine dash="6 4" label="Dự phòng / suy ra, ngoài mã nguồn" />
      <li className="flex items-center gap-2.5">
        <span className="border-muted-foreground h-3 w-7 shrink-0 rounded-sm border border-dashed" aria-hidden />
        <span>Ô viền nét đứt: cấu hình ngoài 3 dự án, cần xác nhận</span>
      </li>
      <li className="flex items-center gap-2.5">
        <TriangleAlert className="size-4 w-7 shrink-0 text-amber-500" aria-hidden />
        <span>Có điểm cần lưu ý — xem trong thẻ thông tin</span>
      </li>
    </ul>
  );
}
