/* eslint-disable max-lines */

import { ChartConfig } from "@/components/ui/chart";

export const leadsChartData = [
  { date: "1-5", newLeads: 120, disqualified: 40 },
  { date: "6-10", newLeads: 95, disqualified: 30 },
  { date: "11-15", newLeads: 60, disqualified: 22 },
  { date: "16-20", newLeads: 100, disqualified: 35 },
  { date: "21-25", newLeads: 150, disqualified: 70 },
  { date: "26-30", newLeads: 110, disqualified: 60 },
];

export const leadsChartConfig = {
  newLeads: {
    label: "Người theo dõi mới",
    color: "var(--chart-1)",
  },
  disqualified: {
    label: "Bỏ theo dõi",
    color: "var(--chart-3)",
  },
  background: {
    color: "var(--primary)",
  },
} as ChartConfig;

export const proposalsChartData = [
  { date: "1-5", proposalsSent: 9 },
  { date: "6-10", proposalsSent: 16 },
  { date: "11-15", proposalsSent: 6 },
  { date: "16-20", proposalsSent: 18 },
  { date: "21-25", proposalsSent: 11 },
  { date: "26-30", proposalsSent: 14 },
];

export const proposalsChartConfig = {
  proposalsSent: {
    label: "Proposals Sent",
    color: "var(--chart-1)",
  },
} as ChartConfig;

export const revenueChartData = [
  { month: "Tháng 7 2024", revenue: 6700 },
  { month: "Tháng 8 2024", revenue: 7100 },
  { month: "Tháng 9 2024", revenue: 6850 },
  { month: "Tháng 10 2024", revenue: 7500 },
  { month: "Tháng 11 2024", revenue: 8000 },
  { month: "Tháng 12 2024", revenue: 8300 },
  { month: "Tháng 1 2025", revenue: 7900 },
  { month: "Tháng 2 2025", revenue: 8400 },
  { month: "Tháng 3 2025", revenue: 8950 },
  { month: "Tháng 4 2025", revenue: 9700 },
  { month: "Tháng 5 2025", revenue: 11200 },
  { month: "Tháng 6 2025", revenue: 9500 },
];

export const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} as ChartConfig;

export const leadsBySourceChartData = [
  { source: "website", leads: 170, fill: "var(--color-website)" },
  { source: "referral", leads: 105, fill: "var(--color-referral)" },
  { source: "social", leads: 90, fill: "var(--color-social)" },
  { source: "cold", leads: 62, fill: "var(--color-cold)" },
  { source: "other", leads: 48, fill: "var(--color-other)" },
];

export const leadsBySourceChartConfig = {
  leads: {
    label: "Leads",
  },
  website: {
    label: "Mạng xã hội",
    color: "var(--chart-1)",
  },
  referral: {
    label: "Hồ sơ",
    color: "var(--chart-2)",
  },
  social: {
    label: "Tìm kiếm",
    color: "var(--chart-3)",
  },
  cold: {
    label: "Hashtag",
    color: "var(--chart-4)",
  },
  other: {
    label: "Khác",
    color: "var(--chart-5)",
  },
} as ChartConfig;

export type RevenueGroupRow = { name: string; revenue: number };

export function buildRevenueHorizontalBars(rows: RevenueGroupRow[]) {
  const normalized = (rows ?? []).map((r) => ({
    name: String(r.name ?? "").trim() || "Không rõ",
    actual: Number(r.revenue) || 0,
  }));

  // remaining để 0 cho giống cấu trúc cũ (không dùng mục tiêu nữa)
  const data = normalized.map((r) => ({
    ...r,
    remaining: 0,
  }));

  const config: ChartConfig = {
    actual: { label: "Doanh thu", color: "var(--chart-1)" },
    remaining: { label: " ", color: "var(--chart-2)" },
    label: { color: "var(--primary-foreground)" },
  } as ChartConfig;

  // Mỗi chi nhánh 1 màu khác nhau theo theme
  normalized.forEach((r, i) => {
    const colorKey = `branch-${i}`;
    (config as any)[colorKey] = {
      label: r.name,
      color: chartColorByIndex(i),
    };
  });

  return { data, config };
}

const slugify = (s: string) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "unknown";

const chartColorByIndex = (i: number) => `var(--chart-${(i % 5) + 1})`;

export function buildRevenuePie(rows: RevenueGroupRow[], valueLabel = "Doanh thu") {
  const normalized = (rows ?? []).map((r) => ({
    label: String(r.name ?? "").trim() || "Không rõ",
    revenue: Number(r.revenue) || 0,
  }));

  const data = normalized.map((r) => {
    const key = slugify(r.label);
    return { source: key, revenue: r.revenue, fill: `var(--color-${key})` };
  });

  const config: ChartConfig = { revenue: { label: valueLabel } } as ChartConfig;

  normalized.forEach((r, i) => {
    const key = slugify(r.label);
    (config as any)[key] = { label: r.label, color: chartColorByIndex(i) };
  });

  return { data, config };
}

export const projectRevenueChartData = [
  { name: "Xu hướng", actual: 82000, target: 90000 },
  { name: "Hướng dẫn", actual: 48000, target: 65000 },
  { name: "Debut", actual: 34000, target: 45000 },
  { name: "Livestream", actual: 77000, target: 90000 },
  { name: "Quảng cáo", actual: 68000, target: 80000 },
  { name: "Hợp tác", actual: 52000, target: 70000 },
].map((row) => ({
  ...row,
  remaining: Math.max(0, row.target - row.actual),
}));

export const projectRevenueChartConfig = {
  actual: {
    label: "Thực tế",
    color: "var(--chart-1)",
  },
  remaining: {
    label: "Còn lại",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--primary-foreground)",
  },
} as ChartConfig;

export const salesPipelineChartData = [
  { stage: "Leads", value: 680, fill: "var(--chart-1)" },
  { stage: "Engaged", value: 480, fill: "var(--chart-2)" },
  { stage: "Clicks", value: 210, fill: "var(--chart-3)" },
  { stage: "Add to cart", value: 120, fill: "var(--chart-4)" },
  { stage: "Sales", value: 45, fill: "var(--chart-5)" },
];

export const salesPipelineChartConfig = {
  value: {
    label: "Leads",
    color: "var(--chart-1)",
  },
  stage: {
    label: "Stage",
  },
} as ChartConfig;

export const regionSalesData = [
  {
    region: "Việt Nam",
    sales: 37800,
    percentage: 31,
    growth: "-3.2%",
    isPositive: false,
  },
  {
    region: "Trung Quốc",
    sales: 40100,
    percentage: 34,
    growth: "+9.4%",
    isPositive: true,
  },
  {
    region: "Nhật Bản",
    sales: 30950,
    percentage: 26,
    growth: "+12.8%",
    isPositive: true,
  },
  {
    region: "Hàn Quốc",
    sales: 12200,
    percentage: 7,
    growth: "-1.7%",
    isPositive: false,
  },
  {
    region: "Mỹ",
    sales: 2450,
    percentage: 2,
    growth: "+6.0%",
    isPositive: true,
  },
];

export const actionItems = [
  {
    id: 1,
    title: "Gửi tài liệu khởi động",
    desc: "Gửi tài liệu khởi động và timeline xây kênh",
    due: "Hôm nay",
    priority: "Cao",
    priorityColor: "bg-red-100 text-red-700",
    checked: false,
  },
  {
    id: 2,
    title: "Khám kênh đối thủ",
    desc: "Mở qua zoom để phân tích đối thủ",
    due: "Cuối tuần",
    priority: "Trung bình",
    priorityColor: "bg-yellow-100 text-yellow-700",
    checked: true,
  },
  {
    id: 3,
    title: "Theo dõi số liệu kênh học viên",
    desc: "Cập nhật số liệu hàng tuần",
    due: "Cuối tuần",
    priority: "Thấp",
    priorityColor: "bg-green-100 text-green-700",
    checked: false,
  },
];

export const recentLeadsData = [
  {
    id: "L-1012",
    name: "Guillermo Rauch",
    company: "Vercel",
    status: "Qualified",
    source: "Website",
    lastActivity: "30m ago",
  },
  {
    id: "L-1018",
    name: "Nizzy",
    company: "Mail0",
    status: "Qualified",
    source: "Website",
    lastActivity: "35m ago",
  },
  {
    id: "L-1005",
    name: "Sahaj",
    company: "Tweakcn",
    status: "Negotiation",
    source: "Website",
    lastActivity: "1h ago",
  },
  {
    id: "L-1001",
    name: "Shadcn",
    company: "Shadcn/ui",
    status: "Qualified",
    source: "Website",
    lastActivity: "2h ago",
  },
  {
    id: "L-1003",
    name: "Sam Altman",
    company: "OpenAI",
    status: "Proposal Sent",
    source: "Social Media",
    lastActivity: "4h ago",
  },
  {
    id: "L-1008",
    name: "Michael Andreuzza",
    company: "Lexington Themes",
    status: "Contacted",
    source: "Social Media",
    lastActivity: "5h ago",
  },
  {
    id: "L-1016",
    name: "Skyleen",
    company: "Animate UI",
    status: "Proposal Sent",
    source: "Referral",
    lastActivity: "7h ago",
  },
  {
    id: "L-1007",
    name: "Arham Khan",
    company: "Weblabs Studio",
    status: "Won",
    source: "Website",
    lastActivity: "6h ago",
  },
  {
    id: "L-1011",
    name: "Sebastian Rindom",
    company: "Medusa",
    status: "Proposal Sent",
    source: "Referral",
    lastActivity: "10h ago",
  },
  {
    id: "L-1014",
    name: "Fred K. Schott",
    company: "Astro",
    status: "Contacted",
    source: "Social Media",
    lastActivity: "12h ago",
  },
  {
    id: "L-1010",
    name: "Peer Richelsen",
    company: "Cal.com",
    status: "New",
    source: "Other",
    lastActivity: "8h ago",
  },
  {
    id: "L-1002",
    name: "Ammar Khnz",
    company: "BE",
    status: "Contacted",
    source: "Referral",
    lastActivity: "1d ago",
  },
  {
    id: "L-1015",
    name: "Toby",
    company: "Shadcn UI Kit ",
    status: "Negotiation",
    source: "Other",
    lastActivity: "2d ago",
  },
  {
    id: "L-1006",
    name: "David Haz",
    company: "React Bits",
    status: "Qualified",
    source: "Referral",
    lastActivity: "2d ago",
  },
  {
    id: "L-1004",
    name: "Erşad",
    company: "Align UI",
    status: "New",
    source: "Cold Outreach",
    lastActivity: "3d ago",
  },
];
