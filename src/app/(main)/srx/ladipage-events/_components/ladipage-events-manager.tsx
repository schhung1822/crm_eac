/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { filterBySearchTerm } from "@/lib/search-utils";
import type { SrxLadipageEvent } from "@/lib/srx-ladipage-events";

import { LadipageEventRowActions } from "./ladipage-event-row-actions";

const statusLabelMap: Record<SrxLadipageEvent["status"], string> = {
  archived: "Lưu trữ",
  draft: "Nháp",
  published: "Đã xuất bản",
};

const statusVariantMap: Record<SrxLadipageEvent["status"], "default" | "secondary" | "outline"> = {
  archived: "secondary",
  draft: "outline",
  published: "default",
};

function buildPublicUrl(pathOrUrl: string, publicBaseUrl?: string): string {
  const trimmedPath = pathOrUrl.trim();
  const trimmedBaseUrl = publicBaseUrl?.trim() ?? "";

  if (!trimmedPath) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedPath) || !trimmedBaseUrl) {
    return trimmedPath;
  }

  try {
    const baseUrl = trimmedBaseUrl.endsWith("/") ? trimmedBaseUrl : `${trimmedBaseUrl}/`;
    return new URL(trimmedPath, baseUrl).toString();
  } catch {
    return trimmedPath;
  }
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function LadipageEventsManager({ initialEvents }: { initialEvents: SrxLadipageEvent[] }) {
  const [events, setEvents] = React.useState<SrxLadipageEvent[]>(initialEvents);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredEvents = React.useMemo(() => {
    return filterBySearchTerm(events, searchTerm, (event) => [
      event.name,
      event.slug,
      event.eventName,
      event.publicPath,
      event.status,
      event.templateStyle,
    ]);
  }, [events, searchTerm]);

  const deleteEventRequest = React.useCallback(async (eventId: string) => {
    const response = await fetch(`/api/srx/ladipage-events/${eventId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa Ladipage sự kiện");
    }
  }, []);

  const handleCopyPublicUrl = React.useCallback(async (event: SrxLadipageEvent) => {
    try {
      await navigator.clipboard.writeText(buildPublicUrl(event.publicPath, event.publicBaseUrl));
      toast.success("Đã sao chép URL public");
    } catch {
      toast.error("Không thể sao chép URL public");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (event: SrxLadipageEvent) => {
      if (!window.confirm(`Xóa Ladipage "${event.name}"?`)) {
        return;
      }

      try {
        await deleteEventRequest(event.id);
        setEvents((current) => current.filter((item) => item.id !== event.id));
        toast.success("Đã xóa Ladipage sự kiện");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa Ladipage sự kiện");
      }
    },
    [deleteEventRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxLadipageEvent>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả Ladipage"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn Ladipage ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ladipage" />,
        cell: ({ row }) => (
          <div className="max-w-[420px] min-w-[320px] space-y-1 whitespace-normal">
            <Link
              href={`/srx/ladipage-events/${row.original.id}/edit`}
              className="hover:text-primary inline-block leading-6 font-medium break-words transition-colors"
            >
              {row.original.name}
            </Link>
            <div className="text-muted-foreground text-xs break-all">{row.original.slug}</div>
            <div className="text-sm">{row.original.eventName || "—"}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <Badge variant={statusVariantMap[row.original.status]}>{statusLabelMap[row.original.status]}</Badge>
            <div>
              <Badge variant={row.original.isActive ? "default" : "secondary"}>
                {row.original.isActive ? "Đang bật" : "Đang tắt"}
              </Badge>
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "publicPath",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Public URL" />,
        cell: ({ row }) => {
          const publicUrl = buildPublicUrl(row.original.publicPath, row.original.publicBaseUrl);

          return (
            <div className="max-w-[320px] min-w-[260px] space-y-1 whitespace-normal">
              <div className="font-mono text-xs break-all">{publicUrl || "—"}</div>
              <div className="text-muted-foreground text-xs break-all">{row.original.publicPath || "—"}</div>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "templateStyle",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Template" />,
        cell: ({ row }) => <span className="capitalize">{row.original.templateStyle || "default"}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => <span>{formatDateTime(row.original.updatedAt)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "publishedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Xuất bản" />,
        cell: ({ row }) => <span>{formatDateTime(row.original.publishedAt)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tạo lúc" />,
        cell: ({ row }) => <span>{formatDateTime(row.original.createdAt)}</span>,
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-muted-foreground data-[state=open]:bg-muted flex size-8"
                  size="icon"
                >
                  <EllipsisVertical className="size-4" />
                  <span className="sr-only">Mở menu Ladipage</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <LadipageEventRowActions
                  event={row.original}
                  onCopyPublicUrl={handleCopyPublicUrl}
                  onDelete={handleDelete}
                  publicUrl={buildPublicUrl(row.original.publicPath, row.original.publicBaseUrl)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleCopyPublicUrl, handleDelete],
  );

  const table = useDataTableInstance({
    data: filteredEvents,
    columns,
    getRowId: (row) => row.id,
  });

  const rowSelection = table.getState().rowSelection;
  const selectedEvents = React.useMemo(
    () => filteredEvents.filter((event) => rowSelection[event.id]),
    [filteredEvents, rowSelection],
  );
  const selectedEventCount = selectedEvents.length;

  async function handleBulkDelete() {
    if (selectedEvents.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedEvents.length} Ladipage đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedEvents.map(async (event) => {
          await deleteEventRequest(event.id);
          return event.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setEvents((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} Ladipage`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedEvents.length} Ladipage. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các Ladipage đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Ladipage sự kiện</h1>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, slug, URL public, template..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedEventCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedEventCount})`}
            </Button>
          ) : null}

          <Button asChild>
            <Link href="/srx/ladipage-events/new">
              <Plus className="size-4" />
              Thêm Ladipage
            </Link>
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-card rounded-xl border p-8">
          <h2 className="text-lg font-semibold">Chưa có Ladipage sự kiện</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Tạo Ladipage đầu tiên để quản lý cấu hình landing page sự kiện của website SRX.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/srx/ladipage-events/new">
                <Plus className="size-4" />
                Tạo Ladipage mới
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="nice-scroll overflow-hidden rounded-lg">
          <DataTable
            table={table}
            columns={columns}
            tableClassName="min-w-[1480px]"
            headClassName="h-12 px-3 text-sm"
            rowClassName="[&>td]:border-border/70"
            cellClassName="px-3 py-4 align-top"
          />
        </div>
      )}
    </div>
  );
}
