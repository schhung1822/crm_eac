import { bezierPoint, type EdgeGeometry, type Point } from "./map-geometry";

export interface PlacedLabel extends Point {
  geometry: EdgeGeometry;
}

interface LabelBox extends PlacedLabel {
  w: number;
  h: number;
}

/** Nhãn đặt gần đích hơn điểm giữa, vì các đường toả ra từ một node thường tách nhau rõ hơn ở phía đích. */
const LABEL_POSITION = 0.6;
const CHIP_MAX_WIDTH = 240;
const CHIP_PADDING_X = 18;
const CHIP_LINE_HEIGHT = 16;
const CHIP_PADDING_Y = 10;
const CHAR_WIDTH = 6.6;
const GAP = 6;

/** Ước lượng kích thước chip (px trên màn hình) theo độ dài chữ, đủ dùng để tránh chồng nhau. */
function estimateChipSize(label: string): { w: number; h: number } {
  const textWidth = label.length * CHAR_WIDTH;
  const lines = Math.max(1, Math.ceil(textWidth / (CHIP_MAX_WIDTH - CHIP_PADDING_X)));

  return {
    w: Math.min(CHIP_MAX_WIDTH, textWidth + CHIP_PADDING_X),
    h: lines * CHIP_LINE_HEIGHT + CHIP_PADDING_Y,
  };
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP / 2;
}

/**
 * Đặt nhãn của các cạnh đang xem rồi đẩy dần xuống dưới những nhãn bị chồng.
 * `pixelToWorld` đổi px trên màn hình sang đơn vị bản đồ ở mức zoom hiện tại.
 */
export function placeEdgeLabels(geometries: EdgeGeometry[], pixelToWorld: number): PlacedLabel[] {
  const boxes = geometries
    .map((geometry): LabelBox => {
      const point = bezierPoint(geometry.points, LABEL_POSITION);
      const size = estimateChipSize(geometry.edge.label);

      return { geometry, x: point.x, y: point.y, w: size.w * pixelToWorld, h: size.h * pixelToWorld };
    })
    .sort((a, b) => a.y - b.y);

  const placed: LabelBox[] = [];

  for (const box of boxes) {
    let next = box;

    for (const other of placed) {
      if (overlaps(next, other)) {
        next = { ...next, y: other.y + (other.h + next.h) / 2 + GAP * pixelToWorld };
      }
    }

    placed.push(next);
  }

  return placed.map(({ geometry, x, y }) => ({ geometry, x, y }));
}
