/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Activity, CheckCircle2, ChevronRight, Clock3, RefreshCw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MetaDatasetEventLog, MetaDatasetEventStats } from "@/lib/meta-conversions.shared";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  failed: "Gửi lỗi",
  pending: "Chờ cấu hình",
  sending: "Đang gửi",
  sent: "Đã gửi",
};

const statusClassNames: Record<string, string> = {
  failed: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  sending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

const sourceLabels: Record<string, string> = {
  crm_order_update: "CRM cập nhật đơn",
  ladipage_registration: "Ladipage đăng ký",
  website_checkout: "Website tạo đơn",
};

function getRegistrationHref(event: MetaDatasetEventLog): string {
  return event.event_slug ? `/events?event=${encodeURIComponent(event.event_slug)}` : "/events";
}

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDateTime(value: Date | null, withSeconds = false): string {
  if (!value) return "—";

  // MySQL DATETIME stores Vietnam wall time, but Prisma materializes it as UTC.
  // Reading the UTC parts preserves the stored clock value instead of adding the browser offset again.
  const date = new Date(value);
  const time = `${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}`;
  const day = `${padTwo(date.getUTCDate())}/${padTwo(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
  return `${day} ${withSeconds ? `${time}:${padTwo(date.getUTCSeconds())}` : time}`;
}

function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === "all" || filter === status) return true;
  return filter === "waiting" && (status === "pending" || status === "sending");
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusClassNames[status]}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}

function SourceRecordLink({ event }: { event: MetaDatasetEventLog }) {
  if (event.order_id) {
    return (
      <Link
        className="text-primary font-medium hover:underline"
        href={`/srx/orders/${event.order_id}`}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        Đơn {event.order_number}
      </Link>
    );
  }

  if (event.registration_id) {
    return (
      <Link
        className="text-primary font-medium hover:underline"
        href={getRegistrationHref(event)}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        Đăng ký #{event.registration_id}
      </Link>
    );
  }

  return <span className="font-medium">{event.order_number || "—"}</span>;
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
  active,
  onClick,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl text-left" aria-pressed={active}>
      <Card
        className={cn(
          "hover:border-primary/40 gap-0 py-0 shadow-sm transition-colors",
          active && "border-primary ring-primary/20 ring-2",
        )}
      >
        <CardContent className="flex items-center gap-3 px-4 py-4">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground text-xs font-medium">{label}</div>
            <div className="mt-0.5 truncate text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-muted-foreground truncate text-xs">{description}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-all">{children}</dd>
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="bg-muted/60 nice-scroll max-h-[340px] overflow-auto rounded-lg border p-4 text-xs leading-5 break-all whitespace-pre-wrap">
      {value === null || value === undefined ? "Chưa có dữ liệu" : JSON.stringify(value, null, 2)}
    </pre>
  );
}

// eslint-disable-next-line complexity
function EventDetailDrawer({
  event,
  onClose,
  onRetry,
  isRetrying,
}: {
  event: MetaDatasetEventLog;
  onClose: () => void;
  onRetry: (event: MetaDatasetEventLog) => void;
  isRetrying: boolean;
}) {
  const isMobile = useIsMobile();
  const canRetry = event.status === "failed" || event.status === "pending";

  return (
    <Drawer open onOpenChange={(open) => (open ? undefined : onClose())} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[94vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[720px]">
        <DrawerHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{event.event_name}</DrawerTitle>
            <StatusBadge status={event.status} />
          </div>
          <DrawerDescription className="font-mono text-xs break-all">{event.event_id}</DrawerDescription>
        </DrawerHeader>

        <div className="nice-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <dl className="bg-muted/30 grid gap-x-6 gap-y-4 rounded-xl border p-4 sm:grid-cols-2">
            <DetailItem label="Dữ liệu nguồn">
              <SourceRecordLink event={event} />
              {event.event_slug ? (
                <span className="text-muted-foreground font-normal"> · {event.event_slug}</span>
              ) : null}
            </DetailItem>
            <DetailItem label="Nguồn phát">{sourceLabels[event.source] ?? event.source}</DetailItem>
            <DetailItem label="Tạo lúc">{formatDateTime(event.created_at, true)}</DetailItem>
            <DetailItem label="Gửi lúc">{formatDateTime(event.sent_at, true)}</DetailItem>
            <DetailItem label="Lần thử cuối">{formatDateTime(event.last_attempt_at, true)}</DetailItem>
            <DetailItem label="Số lần thử / HTTP">
              {event.attempt_count} · HTTP {event.response_http_status ?? "—"}
            </DetailItem>
            <DetailItem label="Route">{event.source_path || "—"}</DetailItem>
            <DetailItem label="Dataset">{event.dataset_id || "Chưa cấu hình"}</DetailItem>
          </dl>

          {event.last_error ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm break-words">
              {event.last_error}
            </div>
          ) : null}

          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-sm font-semibold">Payload đã gửi</h3>
              <p className="text-muted-foreground text-xs">Email, SĐT và tên đã được SHA-256 trước khi lưu và gửi.</p>
            </div>
            <JsonPreview value={event.payload} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Phản hồi từ Meta</h3>
            <JsonPreview value={event.response} />
          </section>

          {event.meta_trace_id ? (
            <div className="text-muted-foreground text-xs break-all">Meta trace ID: {event.meta_trace_id}</div>
          ) : null}
        </div>

        <DrawerFooter className="bg-background shrink-0 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
          {canRetry ? (
            <Button onClick={() => onRetry(event)} disabled={isRetrying}>
              <RefreshCw className={isRetrying ? "animate-spin" : ""} />
              {isRetrying ? "Đang gửi..." : "Gửi lại"}
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function MetaEventsManager({
  initialEvents,
  stats,
}: {
  initialEvents: MetaDatasetEventLog[];
  stats: MetaDatasetEventStats;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = React.useTransition();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [eventFilter, setEventFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedEvent, setSelectedEvent] = React.useState<MetaDatasetEventLog | null>(null);
  const [retryingId, setRetryingId] = React.useState("");

  const filteredEvents = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return initialEvents.filter((event) => {
      const matchesSearch =
        !term ||
        [
          event.order_number,
          event.registration_id,
          event.event_slug,
          event.event_id,
          event.meta_trace_id,
          event.source,
          event.last_error,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesEvent = eventFilter === "all" || event.event_name === eventFilter;
      const matchesSource = sourceFilter === "all" || event.source === sourceFilter;
      const matchesStatus = matchesStatusFilter(event.status, statusFilter);
      return matchesSearch && matchesEvent && matchesSource && matchesStatus;
    });
  }, [eventFilter, initialEvents, searchTerm, sourceFilter, statusFilter]);

  async function handleRetry(event: MetaDatasetEventLog) {
    try {
      setRetryingId(event.id);
      const response = await fetch(`/api/srx/meta-events/${event.id}/retry`, { method: "POST" });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.message ?? "Không thể gửi lại sự kiện");
      if (result.delivered) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
      setSelectedEvent(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi lại sự kiện");
    } finally {
      setRetryingId("");
    }
  }

  function toggleStatusFilter(value: string) {
    setStatusFilter((current) => (current === value ? "all" : value));
  }

  const formatCount = (value: number) => value.toLocaleString("vi-VN");
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
  const hasFilters =
    searchTerm.trim() !== "" || eventFilter !== "all" || sourceFilter !== "all" || statusFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sự kiện Meta Dataset</h1>
          <p className="text-muted-foreground text-sm">
            CompleteRegistration và Purchase gửi lên Meta từ đơn hàng và đăng ký Ladipage.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="Tổng sự kiện"
          value={formatCount(stats.total)}
          description={`${formatCount(stats.last24Hours)} sự kiện trong 24 giờ qua`}
          icon={<Activity className="size-5" />}
          iconClassName="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <SummaryCard
          label="Đã gửi"
          value={formatCount(stats.sent)}
          description={`Tỷ lệ thành công ${successRate}%`}
          icon={<CheckCircle2 className="size-5" />}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          active={statusFilter === "sent"}
          onClick={() => toggleStatusFilter("sent")}
        />
        <SummaryCard
          label="Chờ / đang gửi"
          value={formatCount(stats.pending + stats.sending)}
          description={`${formatCount(stats.pending)} chờ cấu hình · ${formatCount(stats.sending)} đang gửi`}
          icon={<Clock3 className="size-5" />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          active={statusFilter === "waiting"}
          onClick={() => toggleStatusFilter("waiting")}
        />
        <SummaryCard
          label="Gửi lỗi"
          value={formatCount(stats.failed)}
          description="Mở chi tiết để gửi lại"
          icon={<XCircle className="size-5" />}
          iconClassName="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          active={statusFilter === "failed"}
          onClick={() => toggleStatusFilter("failed")}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b p-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-sm xl:flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="bg-background pl-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã đơn, event ID, trace ID, lỗi..."
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:flex-1 xl:justify-end">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full xl:w-[220px]">
                <SelectValue placeholder="Loại sự kiện" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả sự kiện</SelectItem>
                <SelectItem value="CompleteRegistration">
                  CompleteRegistration ({formatCount(stats.completeRegistration)})
                </SelectItem>
                <SelectItem value="Purchase">Purchase ({formatCount(stats.purchase)})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full xl:w-[200px]">
                <SelectValue placeholder="Nguồn phát" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nguồn</SelectItem>
                <SelectItem value="ladipage_registration">
                  Ladipage đăng ký ({formatCount(stats.ladipageRegistrations)})
                </SelectItem>
                <SelectItem value="website_checkout">Website tạo đơn</SelectItem>
                <SelectItem value="crm_order_update">CRM cập nhật đơn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full xl:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="sent">Đã gửi</SelectItem>
                <SelectItem value="waiting">Chờ / đang gửi</SelectItem>
                <SelectItem value="pending">Chờ cấu hình</SelectItem>
                <SelectItem value="sending">Đang gửi</SelectItem>
                <SelectItem value="failed">Gửi lỗi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="nice-scroll overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Thời gian</TableHead>
                <TableHead>Sự kiện</TableHead>
                <TableHead>Dữ liệu nguồn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Kết quả</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                    Chưa có sự kiện phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <TableCell className="pl-4 whitespace-nowrap tabular-nums">
                      <div className="font-medium">{formatDateTime(event.created_at)}</div>
                      <div className="text-muted-foreground text-xs">
                        {event.sent_at ? `Gửi ${formatDateTime(event.sent_at, true)}` : "Chưa gửi"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{event.event_name}</div>
                      <div className="text-muted-foreground text-xs">{sourceLabels[event.source] ?? event.source}</div>
                    </TableCell>
                    <TableCell>
                      <SourceRecordLink event={event} />
                      <div className="text-muted-foreground max-w-[220px] truncate text-xs">
                        {event.event_slug || event.source_path || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        HTTP {event.response_http_status ?? "—"} · {event.attempt_count} lần thử
                      </div>
                      {event.last_error ? (
                        <div className="text-destructive max-w-[260px] truncate text-xs">{event.last_error}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ChevronRight className="text-muted-foreground inline size-4" />
                      <span className="sr-only">Xem sự kiện</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs">
          <span className="tabular-nums">
            {formatCount(filteredEvents.length)} / {formatCount(initialEvents.length)} sự kiện
            {hasFilters ? " (đang lọc)" : ""}
          </span>
          <span>Bảng hiển thị tối đa 500 sự kiện gần nhất; thẻ thống kê tính trên toàn bộ lịch sử.</span>
        </div>
      </Card>

      {selectedEvent ? (
        <EventDetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRetry={handleRetry}
          isRetrying={retryingId === selectedEvent.id}
        />
      ) : null}
    </div>
  );
}
