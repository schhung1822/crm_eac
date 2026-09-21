"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SrxLadipageVisitsReport, SrxLadipageVisitStats } from "@/lib/srx-ladipage-visits";

import type { RegistrationEventOption } from "./registrations-manager";

type Props = {
  eventOptions: RegistrationEventOption[];
  selectedSlug: string;
  report: SrxLadipageVisitsReport | null;
  error: string;
  registrationCounts: Record<string, number>;
};

type ChartRow = {
  id: string;
  name: string;
  pageViews: number | null;
  registrations: number;
  sessions: number;
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
};

const formatter = new Intl.NumberFormat("vi-VN");
const emptyVisits: SrxLadipageVisitStats = {
  eventId: "",
  pageViews: 0,
  sessions: 0,
  desktop: 0,
  mobile: 0,
  tablet: 0,
  unknown: 0,
};
const comparisonConfig = {
  pageViews: { label: "Lượt truy cập", color: "var(--chart-1)" },
  registrations: { label: "Lượt đăng ký", color: "var(--chart-2)" },
} satisfies ChartConfig;
const deviceConfig = {
  mobile: { label: "Điện thoại", color: "var(--chart-1)" },
  desktop: { label: "Máy tính", color: "var(--chart-2)" },
  tablet: { label: "Máy tính bảng", color: "var(--chart-3)" },
  unknown: { label: "Khác", color: "var(--chart-4)" },
} satisfies ChartConfig;
const deviceTypes = [
  { key: "mobile", label: "Điện thoại", color: "var(--chart-1)" },
  { key: "desktop", label: "Máy tính", color: "var(--chart-2)" },
  { key: "tablet", label: "Máy tính bảng", color: "var(--chart-3)" },
  { key: "unknown", label: "Khác", color: "var(--chart-4)" },
] as const;

function formatCount(value: number | null): string {
  return value === null ? "—" : formatter.format(value);
}

function buildRows({ eventOptions, selectedSlug, report, registrationCounts }: Omit<Props, "error">): ChartRow[] {
  const events = selectedSlug ? eventOptions.filter((event) => event.slug === selectedSlug) : eventOptions;
  const hasPageViews = Boolean(report?.available && report.hasPageViews);

  return events.map((event) => {
    const visits = report?.byEventId[event.id] ?? emptyVisits;
    return {
      id: event.id,
      name: event.name,
      pageViews: hasPageViews ? visits.pageViews : null,
      registrations: registrationCounts[event.slug] ?? 0,
      sessions: visits.sessions,
      desktop: visits.desktop,
      mobile: visits.mobile,
      tablet: visits.tablet,
      unknown: visits.unknown,
    };
  });
}

function MetricCard({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <Card className="gap-1 py-3">
      <CardHeader className="px-4">
        <CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tabular-nums">{formatCount(value)}</div>
        <p className="text-muted-foreground text-xs">{note}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({ rows }: { rows: ChartRow[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Truy cập và đăng ký</CardTitle>
        <p className="text-muted-foreground text-xs">So sánh số lượt theo từng Ladipage · Toàn thời gian</p>
      </CardHeader>
      <CardContent className="min-w-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">Chưa có Ladipage để thống kê.</p>
        ) : (
          <div className="overflow-x-auto">
            <ChartContainer
              config={comparisonConfig}
              className="aspect-auto h-[300px] w-full"
              style={{ minWidth: Math.max(360, rows.length * 110) }}
            >
              <BarChart accessibilityLayer data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickMargin={10}
                  tickFormatter={(name: string) => (name.length > 14 ? `${name.slice(0, 14)}…` : name)}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={42} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="pageViews" fill="var(--color-pageViews)" radius={[5, 5, 0, 0]} maxBarSize={34} />
                <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-[var(--chart-1)]" />
            Lượt truy cập
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-[var(--chart-2)]" />
            Lượt đăng ký
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceChart({ rows }: { rows: ChartRow[] }) {
  const totalSessions = rows.reduce((sum, row) => sum + row.sessions, 0);
  const data = deviceTypes
    .map((device) => ({
      ...device,
      sessions: rows.reduce((sum, row) => sum + row[device.key], 0),
    }))
    .filter((device) => device.sessions > 0);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Thiết bị truy cập</CardTitle>
        <p className="text-muted-foreground text-xs">Tỷ trọng theo số phiên truy cập</p>
      </CardHeader>
      <CardContent>
        {totalSessions === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">Chưa có dữ liệu thiết bị.</p>
        ) : (
          <>
            <ChartContainer config={deviceConfig} className="mx-auto aspect-auto h-[230px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="label" hideLabel />} />
                <Pie data={data} dataKey="sessions" nameKey="label" innerRadius={0} outerRadius={92} paddingAngle={2}>
                  {data.map((device) => (
                    <Cell key={device.key} fill={device.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {data.map((device) => (
                <div key={device.key} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: device.color }} />
                    {device.label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {Math.round((device.sessions / totalSessions) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getNotice(report: SrxLadipageVisitsReport | null, error: string): string {
  if (error) return error;
  if (!report?.available) {
    return "Chưa có bảng lượt truy cập trong database SRX; dữ liệu truy cập sẽ xuất hiện sau khi website bắt đầu ghi nhận.";
  }
  if (!report.hasPageViews) {
    return "Dữ liệu cũ chỉ lưu số phiên; lượt truy cập sẽ xuất hiện sau khi website cập nhật bộ đếm ở lần ghi nhận tiếp theo.";
  }
  return "";
}

function DashboardHeader({ eventOptions, selectedSlug }: Pick<Props, "eventOptions" | "selectedSlug">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEvent = eventOptions.find((event) => event.slug === selectedSlug);

  function handleEventChange(nextSlug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSlug === "all") params.delete("event");
    else params.set("event", nextSlug);
    const queryString = params.toString();
    router.push(queryString ? `/events?${queryString}` : "/events");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 id="visit-stats-heading" className="text-3xl font-bold tracking-tight">
          Dashboard Ladipage sự kiện
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {selectedEvent ? `Dữ liệu của ${selectedEvent.name}` : "Tổng quan các Ladipage"} · Toàn thời gian
        </p>
      </div>
      <Select value={selectedSlug || "all"} onValueChange={handleEventChange}>
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="Lọc theo Ladipage" />
        </SelectTrigger>
        <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
          <SelectItem value="all">Tất cả Ladipage</SelectItem>
          {eventOptions.map((event) => (
            <SelectItem key={event.slug} value={event.slug}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function LadipageVisitDashboard({ eventOptions, selectedSlug, report, error, registrationCounts }: Props) {
  const rows = buildRows({ eventOptions, selectedSlug, report, registrationCounts });
  const registrations = rows.reduce((sum, row) => sum + row.registrations, 0);
  const pageViews = rows.reduce((sum, row) => sum + (row.pageViews ?? 0), 0);
  const sessions = rows.reduce((sum, row) => sum + row.sessions, 0);
  const notice = getNotice(report, error);

  return (
    <section className="space-y-4" aria-labelledby="visit-stats-heading">
      <DashboardHeader eventOptions={eventOptions} selectedSlug={selectedSlug} />
      {notice ? <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Lượt truy cập" value={report?.hasPageViews ? pageViews : null} note="Số lần mở Ladipage" />
        <MetricCard
          label="Phiên truy cập"
          value={report?.available ? sessions : null}
          note="Phiên trình duyệt 30 phút"
        />
        <MetricCard label="Lượt đăng ký" value={registrations} note="Form đăng ký thành công" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <ComparisonChart rows={rows} />
        <DeviceChart rows={rows} />
      </div>
    </section>
  );
}
