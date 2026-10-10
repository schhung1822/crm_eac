import { getEdgeNodeIds, getFlowEdgeSteps, getNodeEdges, NODE_BY_ID } from "./map-geometry";
import { LANE_BY_ID } from "./map-layout";
import type { MapFlow } from "./map-types";

export type EdgeVisual = "normal" | "flow" | "flow-dim" | "emphasis" | "faded";

export interface MapFocusState {
  flow: MapFlow | null;
  flowEdges: ReadonlySet<string> | null;
  flowNodes: ReadonlySet<string> | null;
  stepByEdge: ReadonlyMap<string, number>;
  focusEdges: ReadonlySet<string> | null;
  focusNodes: ReadonlySet<string> | null;
  /** Node đang xem đã có thẻ liệt kê kết nối, nên chỉ khi trỏ vào một bước mới cần hiện nhãn trên đường. */
  focusSource: "node" | "step" | null;
  inspectedNodeId: string | null;
  inspectedColor: string;
}

export const MUTED_EDGE_COLOR = "var(--muted-foreground)";
const FALLBACK_EMPHASIS_COLOR = "var(--primary)";

function getInspectedColor(nodeId: string | null): string {
  const node = nodeId ? NODE_BY_ID.get(nodeId) : undefined;
  return (node && LANE_BY_ID.get(node.lane)?.color) ?? FALLBACK_EMPHASIS_COLOR;
}

function getFocusSource(inspectedNodeId: string | null, focusEdges: Set<string> | null): MapFocusState["focusSource"] {
  if (inspectedNodeId) return "node";
  return focusEdges ? "step" : null;
}

/**
 * Thứ tự ưu tiên: node đang xem (hover / ghim) → bước đang trỏ trong bảng luồng → cả luồng đang chọn.
 * Thứ gì không thuộc vùng đang xem sẽ bị làm mờ.
 */
export function buildMapFocus(
  flow: MapFlow | null,
  inspectedNodeId: string | null,
  emphasizedEdgeIds: ReadonlySet<string> | null,
): MapFocusState {
  const flowEdges = flow ? new Set(flow.steps.flatMap((step) => step.edges)) : null;
  let focusEdges: Set<string> | null = null;
  let focusNodes: Set<string> | null = null;

  if (inspectedNodeId) {
    const { incoming, outgoing } = getNodeEdges(inspectedNodeId);
    focusEdges = new Set([...incoming, ...outgoing].map((edge) => edge.id));
    focusNodes = getEdgeNodeIds(focusEdges);
    focusNodes.add(inspectedNodeId);
  } else if (emphasizedEdgeIds?.size) {
    focusEdges = new Set(emphasizedEdgeIds);
    focusNodes = getEdgeNodeIds(focusEdges);
  }

  return {
    flow,
    flowEdges,
    flowNodes: flowEdges ? getEdgeNodeIds(flowEdges) : null,
    stepByEdge: flow ? getFlowEdgeSteps(flow) : new Map(),
    focusEdges,
    focusNodes,
    focusSource: getFocusSource(inspectedNodeId, focusEdges),
    inspectedNodeId,
    inspectedColor: getInspectedColor(inspectedNodeId),
  };
}

export function getEdgeVisual(focus: MapFocusState, edgeId: string): EdgeVisual {
  const inFlow = focus.flowEdges?.has(edgeId) ?? false;

  if (focus.focusEdges) {
    if (focus.focusEdges.has(edgeId)) return "emphasis";
    return inFlow ? "flow-dim" : "faded";
  }

  if (focus.flowEdges) {
    return inFlow ? "flow" : "faded";
  }

  return "normal";
}

/** Cạnh thuộc luồng đang chọn lấy màu luồng, còn lại lấy màu làn của node đang xem. */
export function getEdgeColor(focus: MapFocusState, edgeId: string, visual: EdgeVisual): string {
  if (visual === "normal" || visual === "faded") return MUTED_EDGE_COLOR;
  if (focus.flow && focus.flowEdges?.has(edgeId)) return focus.flow.color;
  return focus.inspectedColor;
}

export function isNodeDimmed(focus: MapFocusState, nodeId: string): boolean {
  if (focus.focusNodes) return !focus.focusNodes.has(nodeId);
  if (focus.flowNodes) return !focus.flowNodes.has(nodeId);
  return false;
}
