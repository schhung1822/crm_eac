export type LaneId = "source" | "touchpoint" | "website" | "crm" | "integration" | "storage" | "output" | "report";

export type SystemId = "srx-web" | "crm-eac" | "miniapp" | "third-party" | "mysql-srx" | "mysql-crm";

export type MapIconKey =
  | "facebook"
  | "google"
  | "zalo"
  | "meta"
  | "n8n"
  | "tiktok"
  | "google-analytics"
  | "organic"
  | "share"
  | "store"
  | "globe"
  | "qr"
  | "calendar"
  | "message"
  | "handshake"
  | "login"
  | "smartphone"
  | "radar"
  | "cart"
  | "webhook"
  | "shield"
  | "server"
  | "users"
  | "clock"
  | "boxes"
  | "bot"
  | "refresh"
  | "receipt"
  | "logs"
  | "user-round"
  | "package"
  | "image"
  | "key"
  | "database"
  | "send"
  | "mail"
  | "chart";

export interface MapLink {
  label: string;
  href: string;
}

export interface MapNode {
  id: string;
  lane: LaneId;
  y: number;
  title: string;
  subtitle: string;
  icon: MapIconKey;
  system: SystemId;
  summary: string;
  details?: string[];
  note?: string;
  /** Phần cấu hình nằm ngoài 3 dự án, chỉ suy ra từ dấu vết trong mã nguồn. */
  external?: boolean;
  refs?: string[];
  links?: MapLink[];
}

export type EdgeKind = "main" | "read" | "fallback" | "inferred";

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind?: EdgeKind;
}

export interface MapFlowStep {
  text: string;
  edges: string[];
}

export interface MapFlow {
  id: string;
  title: string;
  summary: string;
  color: string;
  steps: MapFlowStep[];
}

export interface MapLane {
  id: LaneId;
  x: number;
  title: string;
  /** Tên rút gọn cho hàng tiêu đề khi bản đồ đang thu nhỏ. */
  short: string;
  hint: string;
  color: string;
}

export interface MapGroup {
  id: string;
  title: string;
  nodes: string[];
}
