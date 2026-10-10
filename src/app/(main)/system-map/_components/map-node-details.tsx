"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowUpRight, FileCode2, Pin, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { NODE_BY_ID, getNodeEdges } from "./map-geometry";
import { MapIcon } from "./map-icon";
import { LANE_BY_ID, SYSTEM_LABELS } from "./map-layout";
import type { MapEdge, MapLink, MapNode } from "./map-types";

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
}

const CARD_WIDTH = 360;
const CARD_GAP = 14;
const EDGE_MARGIN = 8;
const MAX_CONNECTIONS = 6;

function placeCard(anchor: ScreenRect, viewport: { width: number; height: number }, cardHeight: number) {
  const width = Math.min(CARD_WIDTH, viewport.width - EDGE_MARGIN * 2);
  let left = anchor.right + CARD_GAP;

  if (left + width > viewport.width - EDGE_MARGIN) {
    left = anchor.left - CARD_GAP - width;
  }

  left = Math.min(Math.max(left, EDGE_MARGIN), viewport.width - width - EDGE_MARGIN);
  const top = Math.min(
    Math.max(anchor.top, EDGE_MARGIN),
    Math.max(EDGE_MARGIN, viewport.height - cardHeight - EDGE_MARGIN),
  );

  return { left, top, width };
}

function LinkButton({ link }: { link: MapLink }) {
  const isInternal = link.href.startsWith("/");

  return (
    <Button asChild variant="outline" size="sm" className="h-8">
      {isInternal ? (
        <Link href={link.href}>
          {link.label}
          <ArrowUpRight />
        </Link>
      ) : (
        <a href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
          <ArrowUpRight />
        </a>
      )}
    </Button>
  );
}

function ConnectionList({
  title,
  edges,
  direction,
  onSelectNode,
}: {
  title: string;
  edges: MapEdge[];
  direction: "in" | "out";
  onSelectNode: (nodeId: string) => void;
}) {
  if (!edges.length) return null;

  const visible = edges.slice(0, MAX_CONNECTIONS);

  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{title}</div>
      <ul className="space-y-1">
        {visible.map((edge) => {
          const otherId = direction === "in" ? edge.from : edge.to;
          const other = NODE_BY_ID.get(otherId);

          return (
            <li key={edge.id}>
              <button
                type="button"
                onClick={() => onSelectNode(otherId)}
                className="hover:bg-accent w-full rounded-md px-2 py-1 text-left text-xs leading-4 transition-colors"
              >
                <span className="font-medium">{other?.title ?? otherId}</span>
                <span className="text-muted-foreground"> · {edge.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {edges.length > visible.length ? (
        <div className="text-muted-foreground px-2 text-xs">+{edges.length - visible.length} kết nối khác</div>
      ) : null}
    </div>
  );
}

function DetailsBody({ node, onSelectNode }: { node: MapNode; onSelectNode: (nodeId: string) => void }) {
  const { incoming, outgoing } = getNodeEdges(node.id);

  return (
    <div className="nice-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
      <p className="text-sm leading-6">{node.summary}</p>
      {node.details?.length ? (
        <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-[13px] leading-5">
          {node.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {node.note ? (
        <div className="flex gap-2 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{node.note}</span>
        </div>
      ) : null}
      <ConnectionList title="Nhận dữ liệu từ" edges={incoming} direction="in" onSelectNode={onSelectNode} />
      <ConnectionList title="Gửi dữ liệu tới" edges={outgoing} direction="out" onSelectNode={onSelectNode} />
    </div>
  );
}

export function MapNodeDetails({
  node,
  anchor,
  viewport,
  isPinned,
  onClose,
  onSelectNode,
  onPointerEnter,
  onPointerLeave,
}: {
  node: MapNode;
  anchor: ScreenRect;
  viewport: { width: number; height: number };
  isPinned: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const [cardHeight, setCardHeight] = React.useState(0);
  const lane = LANE_BY_ID.get(node.lane);
  const color = lane?.color ?? "#64748b";
  const position = placeCard(anchor, viewport, cardHeight);

  const measureRef = React.useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    const observer = new ResizeObserver(() => setCardHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={measureRef}
      data-map-overlay=""
      role="dialog"
      aria-label={`Thông tin: ${node.title}`}
      className="bg-popover text-popover-foreground absolute z-20 flex max-h-[min(600px,calc(100%-16px))] cursor-auto flex-col overflow-hidden rounded-xl border shadow-xl"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        borderTopColor: color,
        borderTopWidth: 3,
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${color}1f` }}
        >
          <MapIcon icon={node.icon} color={color} className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="leading-5 font-semibold">{node.title}</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" style={{ borderColor: `${color}66`, color }}>
              {lane?.title}
            </Badge>
            <Badge variant="secondary">{SYSTEM_LABELS.get(node.system)}</Badge>
            {node.external ? (
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                Ngoài mã nguồn
              </Badge>
            ) : null}
          </div>
        </div>
        {isPinned ? (
          <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-7" onClick={onClose} aria-label="Đóng">
            <X />
          </Button>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] whitespace-nowrap">
            <Pin className="size-3" />
            Bấm để ghim
          </span>
        )}
      </div>
      <DetailsBody node={node} onSelectNode={onSelectNode} />
      {node.links?.length ? (
        <div className="bg-muted/30 flex flex-wrap gap-2 border-t px-4 py-3">
          {node.links.map((link) => (
            <LinkButton key={link.href} link={link} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
