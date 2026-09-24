/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Activity, CheckCircle2, Clock3, Eye, RefreshCw, Search, Send, ShoppingCart, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const statusLabels: Record<string, string> = {
  failed: "Gửi lỗi",
  pending: "Chờ cấu hình",
  sending: "Đang gửi",
  sent: "Đã gửi",
};

const sourceLabels: Record<string, string> = {
  crm_order_update: "CRM cập nhật đơn",
  ladipage_registration: "Ladipage đăng ký",
  website_checkout: "Website tạo đơn",
};

function getRegistrationHref(event: MetaDatasetEventLog): string {
  return event.event_slug ? `/events?event=${encodeURIComponent(event.event_slug)}` : "/events";
}

function formatDateTime(value: Date | null): string {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function getStatusVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  if (status === "sent") return "default";
  if (status === "failed") return "destructive";
  if (status === "sending") return "secondary";
  return "outline";
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="bg-muted/60 nice-scroll max-h-[340px] overflow-auto rounded-lg border p-4 text-xs leading-5 break-all whitespace-pre-wrap">
      {value === null || value === undefined ? "Chưa có dữ liệu" : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="text-2xl font-bold tabular-nums">{value}</CardContent>
    </Card>
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
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[94vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[760px]">
        <DrawerHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{event.event_name}</DrawerTitle>
            <Badge variant={getStatusVariant(event.status)}>{statusLabels[event.status] ?? event.status}</Badge>
          </div>
          <DrawerDescription className="break-all">{event.event_id}</DrawerDescription>
        </DrawerHeader>

        <div className="nice-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="shadow-none">
              <CardContent className="grid gap-2 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Dữ liệu nguồn: </span>
                  {event.order_id ? (
                    <Link className="text-primary font-medium" href={`/srx/orders/${event.order_id}`}>
                      Đơn hàng {event.order_number}
                    </Link>
                  ) : event.registration_id ? (
                    <Link className="text-primary font-medium" href={getRegistrationHref(event)}>
                      Đăng ký #{event.registration_id}
                      {event.event_slug ? ` · ${event.event_slug}` : ""}
                    </Link>
                  ) : (
                    <span className="font-medium">{event.order_number || "—"}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Nguồn: </span>
                  {sourceLabels[event.source] ?? event.source}
                </div>
                <div className="break-all">
                  <span className="text-muted-foreground">Route: </span>
                  {event.source_path || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Dataset: </span>
                  {event.dataset_id || "Chưa cấu hình"}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="grid gap-2 p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Số lần thử: </span>
                  {event.attempt_count}
                </div>
                <div>
                  <span className="text-muted-foreground">HTTP: </span>
                  {event.response_http_status ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Tạo lúc: </span>
                  {formatDateTime(event.created_at)}
                </div>
                <div>
                  <span className="text-muted-foreground">Gửi lúc: </span>
                  {formatDateTime(event.sent_at)}
                </div>
              </CardContent>
            </Card>
          </div>

          {event.last_error ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm break-words">
              {event.last_error}
            </div>
          ) : null}

          <section className="space-y-2">
            <h3 className="font-semibold">Payload đã gửi</h3>
            <p className="text-muted-foreground text-xs">
              PII như email, số điện thoại và tên đã được SHA-256 trước khi lưu và gửi.
            </p>
            <JsonPreview value={event.payload} />
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Phản hồi từ Meta</h3>
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
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
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

  const successRate = stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : "0%";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Sự kiện Meta Dataset</h1>
        <p className="text-muted-foreground max-w-3xl">
          Theo dõi CompleteRegistration từ đơn hàng hoặc đăng ký Ladipage, Purchase từ đơn hàng, payload gửi đi, nguồn
          phát và phản hồi của Meta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tổng sự kiện"
          value={stats.total.toLocaleString("vi-VN")}
          icon={<Activity className="size-4" />}
        />
        <MetricCard
          title="Đã gửi"
          value={stats.sent.toLocaleString("vi-VN")}
          icon={<CheckCircle2 className="size-4" />}
        />
        <MetricCard
          title="Chờ / đang gửi"
          value={(stats.pending + stats.sending).toLocaleString("vi-VN")}
          icon={<Clock3 className="size-4" />}
        />
        <MetricCard
          title="Gửi lỗi"
          value={stats.failed.toLocaleString("vi-VN")}
          icon={<XCircle className="size-4" />}
        />
        <MetricCard
          title="CompleteRegistration"
          value={stats.completeRegistration.toLocaleString("vi-VN")}
          icon={<Send className="size-4" />}
        />
        <MetricCard
          title="Purchase"
          value={stats.purchase.toLocaleString("vi-VN")}
          icon={<ShoppingCart className="size-4" />}
        />
        <MetricCard
          title="Từ Ladipage"
          value={stats.ladipageRegistrations.toLocaleString("vi-VN")}
          icon={<Send className="size-4" />}
        />
        <MetricCard
          title="24 giờ gần nhất"
          value={stats.last24Hours.toLocaleString("vi-VN")}
          icon={<Clock3 className="size-4" />}
        />
        <MetricCard title="Tỷ lệ gửi thành công" value={successRate} icon={<CheckCircle2 className="size-4" />} />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm mã đơn, event ID, trace ID, lỗi..."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:w-[690px]">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Loại sự kiện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả sự kiện</SelectItem>
              <SelectItem value="CompleteRegistration">CompleteRegistration</SelectItem>
              <SelectItem value="Purchase">Purchase</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Nguồn phát" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              <SelectItem value="ladipage_registration">Ladipage đăng ký</SelectItem>
              <SelectItem value="website_checkout">Website tạo đơn</SelectItem>
              <SelectItem value="crm_order_update">CRM cập nhật đơn</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="sent">Đã gửi</SelectItem>
              <SelectItem value="pending">Chờ cấu hình</SelectItem>
              <SelectItem value="sending">Đang gửi</SelectItem>
              <SelectItem value="failed">Gửi lỗi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="nice-scroll overflow-x-auto rounded-xl border">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Sự kiện</TableHead>
              <TableHead>Dữ liệu nguồn</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Lần thử</TableHead>
              <TableHead>Kết quả</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-28 text-center">
                  Chưa có sự kiện phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDateTime(event.created_at)}</div>
                    <div className="text-muted-foreground text-xs">Gửi: {formatDateTime(event.sent_at)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{event.event_name}</div>
                    <div className="text-muted-foreground max-w-[230px] truncate text-xs">{event.event_id}</div>
                  </TableCell>
                  <TableCell>
                    {event.order_id ? (
                      <Link className="text-primary font-medium" href={`/srx/orders/${event.order_id}`}>
                        {event.order_number}
                      </Link>
                    ) : event.registration_id ? (
                      <Link className="text-primary font-medium" href={getRegistrationHref(event)}>
                        <span className="block">Đăng ký #{event.registration_id}</span>
                        <span className="text-muted-foreground block max-w-[180px] truncate text-xs">
                          {event.event_slug || "Ladipage"}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-medium">{event.order_number || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{sourceLabels[event.source] ?? event.source}</div>
                    <div className="text-muted-foreground max-w-[180px] truncate text-xs">{event.source_path}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(event.status)}>{statusLabels[event.status] ?? event.status}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{event.attempt_count}</TableCell>
                  <TableCell>
                    <div>HTTP {event.response_http_status ?? "—"}</div>
                    <div className="text-destructive max-w-[220px] truncate text-xs">{event.last_error}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setSelectedEvent(event)}>
                      <Eye className="size-4" />
                      <span className="sr-only">Xem sự kiện</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Bảng hiển thị tối đa 500 sự kiện gần nhất; các thẻ thống kê tính trên toàn bộ lịch sử.
      </p>

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
