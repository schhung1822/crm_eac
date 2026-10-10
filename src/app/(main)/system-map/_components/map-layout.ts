import type { MapGroup, MapLane, SystemId } from "./map-types";

export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 76;

export const LANE_PADDING = 18;

export const MAP_LANES: MapLane[] = [
  { id: "source", x: 0, title: "1. Nguồn khách hàng", short: "1. Nguồn", hint: "Khách đến từ đâu", color: "#3b82f6" },
  {
    id: "touchpoint",
    x: 330,
    title: "2. Điểm chạm",
    short: "2. Điểm chạm",
    hint: "Nơi khách tương tác",
    color: "#0ea5e9",
  },
  {
    id: "website",
    x: 660,
    title: "3. Backend website",
    short: "3. Website",
    hint: "SRX_web tiếp nhận dữ liệu",
    color: "#8b5cf6",
  },
  { id: "crm", x: 990, title: "4. CRM (crm-eac)", short: "4. CRM", hint: "Xử lý trung tâm", color: "#6366f1" },
  {
    id: "integration",
    x: 1320,
    title: "5. Tự động hoá & tích hợp",
    short: "5. Tích hợp",
    hint: "n8n, AI, KiotViet",
    color: "#f59e0b",
  },
  { id: "storage", x: 1650, title: "6. Lưu trữ", short: "6. Lưu trữ", hint: "Dữ liệu nằm ở đâu", color: "#10b981" },
  {
    id: "output",
    x: 1980,
    title: "7. Thông báo & đầu ra",
    short: "7. Đầu ra",
    hint: "Dữ liệu được gửi đi đâu",
    color: "#ec4899",
  },
  {
    id: "report",
    x: 2310,
    title: "8. Báo cáo & đo lường",
    short: "8. Báo cáo",
    hint: "Xem số liệu ở đâu",
    color: "#f97316",
  },
];

export const MAP_GROUPS: MapGroup[] = [
  {
    id: "group-mysql-srx",
    title: "MySQL · Database SRX",
    nodes: ["db-orders", "db-logs", "db-events", "db-affiliate", "db-customers", "db-content"],
  },
  {
    id: "group-mysql-crm",
    title: "MySQL · Database CRM / EAC",
    nodes: ["db-crm-system", "db-eac"],
  },
];

export const SYSTEM_LABELS = new Map<SystemId, string>([
  ["srx-web", "SRX_web"],
  ["crm-eac", "crm-eac"],
  ["miniapp", "miniapp"],
  ["third-party", "Bên thứ ba"],
  ["mysql-srx", "Database SRX"],
  ["mysql-crm", "Database CRM"],
]);

export const LANE_BY_ID = new Map(MAP_LANES.map((lane) => [lane.id, lane]));
