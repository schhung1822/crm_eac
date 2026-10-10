import { MAP_EDGES } from "./map-edges";
import { MAP_FLOWS } from "./map-flows";
import { MAP_GROUPS, MAP_LANES, NODE_HEIGHT, NODE_WIDTH } from "./map-layout";
import { ENTRY_NODES } from "./map-nodes-entry";
import { OUTPUT_LANE_NODES } from "./map-nodes-output";
import { PROCESSING_NODES } from "./map-nodes-processing";
import { STORAGE_LANE_NODES } from "./map-nodes-storage";
import type { MapEdge, MapFlow, MapNode } from "./map-types";

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  w: number;
  h: number;
}

export interface EdgeGeometry {
  edge: MapEdge;
  path: string;
  mid: Point;
  /** Điểm đầu, 2 điểm điều khiển và điểm cuối của đường cong. */
  points: [Point, Point, Point, Point];
}

export interface GroupGeometry extends Box {
  id: string;
  title: string;
}

type Side = "left" | "right" | "top" | "bottom";

interface Attachment {
  edgeId: string;
  end: "from" | "to";
  otherCenter: Point;
}

const LANE_HEADER_GAP = 56;
const WORLD_PADDING = 48;

export const MAP_NODES: MapNode[] = [...ENTRY_NODES, ...PROCESSING_NODES, ...STORAGE_LANE_NODES, ...OUTPUT_LANE_NODES];

export const NODE_BY_ID = new Map(MAP_NODES.map((node) => [node.id, node]));

const laneXById = new Map(MAP_LANES.map((lane) => [lane.id, lane.x]));

export const NODE_BOXES = new Map<string, Box>(
  MAP_NODES.map((node) => [node.id, { x: laneXById.get(node.lane) ?? 0, y: node.y, w: NODE_WIDTH, h: NODE_HEIGHT }]),
);

function getBox(id: string): Box {
  const box = NODE_BOXES.get(id);

  if (!box) {
    throw new Error(`Sơ đồ hệ thống: không tìm thấy node "${id}"`);
  }

  return box;
}

function center(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function pickSides(from: Box, to: Box): [Side, Side] {
  if (to.x >= from.x + from.w) return ["right", "left"];
  if (to.x + to.w <= from.x) return ["left", "right"];
  return to.y >= from.y ? ["bottom", "top"] : ["top", "bottom"];
}

function isVertical(side: Side): boolean {
  return side === "top" || side === "bottom";
}

/** Rải điểm neo dọc theo cạnh node, xếp theo vị trí node bên kia để các đường không cắt nhau ngay tại node. */
function buildAnchors(edges: MapEdge[]): Map<string, Point> {
  const attachments = new Map<string, Attachment[]>();

  for (const edge of edges) {
    const [fromSide, toSide] = pickSides(getBox(edge.from), getBox(edge.to));
    const entries: Array<[string, Side, Attachment]> = [
      [edge.from, fromSide, { edgeId: edge.id, end: "from", otherCenter: center(getBox(edge.to)) }],
      [edge.to, toSide, { edgeId: edge.id, end: "to", otherCenter: center(getBox(edge.from)) }],
    ];

    for (const [nodeId, side, attachment] of entries) {
      const key = `${nodeId}|${side}`;
      attachments.set(key, [...(attachments.get(key) ?? []), attachment]);
    }
  }

  const anchors = new Map<string, Point>();

  for (const [key, list] of attachments) {
    const [nodeId, side] = key.split("|") as [string, Side];
    const box = getBox(nodeId);
    const vertical = isVertical(side);
    const sorted = [...list].sort((a, b) =>
      vertical ? a.otherCenter.x - b.otherCenter.x : a.otherCenter.y - b.otherCenter.y,
    );

    sorted.forEach((attachment, index) => {
      const ratio = 0.22 + (0.56 * (index + 1)) / (sorted.length + 1);
      const point = vertical
        ? { x: box.x + box.w * ratio, y: side === "top" ? box.y : box.y + box.h }
        : { x: side === "left" ? box.x : box.x + box.w, y: box.y + box.h * ratio };

      anchors.set(`${attachment.edgeId}|${attachment.end}`, point);
    });
  }

  return anchors;
}

function controlPoint(point: Point, side: Side, distance: number): Point {
  switch (side) {
    case "left":
      return { x: point.x - distance, y: point.y };
    case "right":
      return { x: point.x + distance, y: point.y };
    case "top":
      return { x: point.x, y: point.y - distance };
    default:
      return { x: point.x, y: point.y + distance };
  }
}

function buildEdgeGeometry(edge: MapEdge, anchors: Map<string, Point>): EdgeGeometry {
  const [fromSide, toSide] = pickSides(getBox(edge.from), getBox(edge.to));
  const start = anchors.get(`${edge.id}|from`) ?? center(getBox(edge.from));
  const end = anchors.get(`${edge.id}|to`) ?? center(getBox(edge.to));
  const span = isVertical(fromSide) ? Math.abs(end.y - start.y) : Math.abs(end.x - start.x);
  const distance = Math.max(isVertical(fromSide) ? 24 : 48, span * 0.45);
  const c1 = controlPoint(start, fromSide, distance);
  const c2 = controlPoint(end, toSide, distance);

  const points: [Point, Point, Point, Point] = [start, c1, c2, end];

  return {
    edge,
    path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
    mid: bezierPoint(points, 0.5),
    points,
  };
}

/** Điểm trên đường cong bậc 3 tại tham số t (0 = đầu, 1 = cuối). */
export function bezierPoint([p0, p1, p2, p3]: [Point, Point, Point, Point], t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;

  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

const anchors = buildAnchors(MAP_EDGES);

export const EDGE_GEOMETRIES: EdgeGeometry[] = MAP_EDGES.map((edge) => buildEdgeGeometry(edge, anchors));

export const GROUP_GEOMETRIES: GroupGeometry[] = MAP_GROUPS.map((group) => {
  const boxes = group.nodes.map(getBox);
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.w));
  const maxY = Math.max(...boxes.map((box) => box.y + box.h));

  return { id: group.id, title: group.title, x: minX - 14, y: minY - 34, w: maxX - minX + 28, h: maxY - minY + 48 };
});

const allBoxes = [...NODE_BOXES.values()];

export const LANE_HEADER_Y = Math.min(...allBoxes.map((box) => box.y)) - LANE_HEADER_GAP;

export const WORLD_BOUNDS: Box = (() => {
  const minX = Math.min(...MAP_LANES.map((lane) => lane.x)) - WORLD_PADDING;
  const maxX = Math.max(...MAP_LANES.map((lane) => lane.x)) + NODE_WIDTH + WORLD_PADDING;
  const minY = LANE_HEADER_Y - WORLD_PADDING / 2;
  const maxY = Math.max(...allBoxes.map((box) => box.y + box.h)) + WORLD_PADDING;

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
})();

/** Số thứ tự bước đầu tiên mà mỗi cạnh xuất hiện trong luồng (1-based). */
export function getFlowEdgeSteps(flow: MapFlow): Map<string, number> {
  const steps = new Map<string, number>();

  flow.steps.forEach((step, index) => {
    for (const edgeId of step.edges) {
      if (!steps.has(edgeId)) {
        steps.set(edgeId, index + 1);
      }
    }
  });

  return steps;
}

export function getEdgeNodeIds(edgeIds: Iterable<string>): Set<string> {
  const edgeById = new Map(MAP_EDGES.map((edge) => [edge.id, edge]));
  const nodeIds = new Set<string>();

  for (const edgeId of edgeIds) {
    const edge = edgeById.get(edgeId);

    if (edge) {
      nodeIds.add(edge.from);
      nodeIds.add(edge.to);
    }
  }

  return nodeIds;
}

export function getBoundsOf(nodeIds: Iterable<string>): Box | null {
  const boxes = [...nodeIds].map((id) => NODE_BOXES.get(id)).filter((box): box is Box => Boolean(box));

  if (!boxes.length) {
    return null;
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.w));
  const maxY = Math.max(...boxes.map((box) => box.y + box.h));

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function getNodeEdges(nodeId: string): { incoming: MapEdge[]; outgoing: MapEdge[] } {
  return {
    incoming: MAP_EDGES.filter((edge) => edge.to === nodeId),
    outgoing: MAP_EDGES.filter((edge) => edge.from === nodeId),
  };
}

export { MAP_EDGES, MAP_FLOWS };
