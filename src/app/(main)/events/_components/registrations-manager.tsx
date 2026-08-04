/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ColumnDef } from "@tanstack/react-table";
import { Download, ExternalLink, LayoutTemplate, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";
import type { SrxLadipageRegistration } from "@/lib/srx-ladipage-registrations";

export type RegistrationEventOption = {
  id: string;
  slug: string;
  name: string;
  eventName: string;
  status: string;
};

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value);
}

/**
 * Mỗi Ladipage có bộ câu hỏi/trường ẩn riêng nên cột bảng phải sinh theo dữ liệu thật:
 * gom tất cả nhãn xuất hiện trong tập đang xem, giữ thứ tự q1..q5 rồi tới trường tuỳ chỉnh.
 */
function collectDynamicColumns(registrations: SrxLadipageRegistration[]) {
  const answerColumns = new Map<string, string>();
  const customColumns = new Map<string, string>();

  for (const registration of registrations) {
    for (const answer of registration.answers) {
      if (!answerColumns.has(answer.key)) {
        answerColumns.set(answer.key, answer.label);
      }
    }

    for (const field of registration.customFields) {
      if (!customColumns.has(field.key)) {
        customColumns.set(field.key, field.label);
      }
    }
  }

  return {
    answers: [...answerColumns.entries()].sort(([left], [right]) => left.localeCompare(right)),
    customFields: [...customColumns.entries()].sort(([left], [right]) => left.localeCompare(right)),
  };
}

function findValue(fields: SrxLadipageRegistration["answers"], key: string): string {
  return fields.find((field) => field.key === key)?.value ?? "";
}

export function RegistrationsManager({
  registrations,
  eventOptions,
  selectedSlug,
}: {
  registrations: SrxLadipageRegistration[];
  eventOptions: RegistrationEventOption[];
  selectedSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredRegistrations = React.useMemo(() => {
    return registrations.filter((registration) =>
      matchesSearchTerm(searchTerm, [
        registration.name,
        registration.phone,
        registration.email,
        registration.eventName,
        registration.voucher,
        registration.userId,
        ...registration.answers.map((answer) => answer.value),
        ...registration.customFields.map((field) => field.value),
      ]),
    );
  }, [registrations, searchTerm]);

  const dynamicColumns = React.useMemo(() => collectDynamicColumns(filteredRegistrations), [filteredRegistrations]);
  const selectedEvent = eventOptions.find((option) => option.slug === selectedSlug) ?? null;

  const handleEventChange = React.useCallback(
    (nextSlug: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextSlug === "all") {
        params.delete("event");
      } else {
        params.set("event", nextSlug);
      }

      const queryString = params.toString();
      router.push(queryString ? `/events?${queryString}` : "/events");
    },
    [router, searchParams],
  );

  const handleExport = React.useCallback(() => {
    if (filteredRegistrations.length === 0) {
      return;
    }

    const headers: Record<string, string> = {
      submittedAt: "Thời gian",
      name: "Họ và tên",
      phone: "Số điện thoại",
      email: "Email",
      eventName: "Sự kiện",
      eventSlug: "Slug Ladipage",
    };

    for (const [key, label] of dynamicColumns.answers) {
      headers[key] = label;
    }

    for (const [key, label] of dynamicColumns.customFields) {
      headers[`custom_${key}`] = label;
    }

    headers.voucher = "Voucher";
    headers.userId = "User ID";

    const rows = filteredRegistrations.map((registration) => {
      const row: Record<string, string> = {
        submittedAt: formatDateTime(registration.submittedAt),
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
        eventName: registration.eventName,
        eventSlug: registration.eventSlug,
        voucher: registration.voucher,
        userId: registration.userId,
      };

      for (const [key] of dynamicColumns.answers) {
        row[key] = findValue(registration.answers, key);
      }

      for (const [key] of dynamicColumns.customFields) {
        row[`custom_${key}`] = findValue(registration.customFields, key);
      }

      return row;
    });

    try {
      exportData({
        format: "csv",
        data: rows,
        headers,
        filename: `lượt-đăng-ký-${selectedSlug || "tat-ca"}`,
      });
      toast.success(`Đã xuất ${rows.length} lượt đăng ký`);
    } catch {
      toast.error("Không thể xuất dữ liệu");
    }
  }, [dynamicColumns, filteredRegistrations, selectedSlug]);

  const columns = React.useMemo<ColumnDef<SrxLadipageRegistration>[]>(() => {
    const baseColumns: ColumnDef<SrxLadipageRegistration>[] = [
      {
        accessorKey: "submittedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
        cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.submittedAt)}</span>,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Người đăng ký" />,
        cell: ({ row }) => (
          <div className="min-w-[200px] space-y-1">
            <div className="font-medium">{row.original.name || "—"}</div>
            <div className="text-muted-foreground text-xs">{row.original.phone || "—"}</div>
            {row.original.email ? <div className="text-muted-foreground text-xs">{row.original.email}</div> : null}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "eventName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ladipage" />,
        cell: ({ row }) => (
          <div className="min-w-[180px] space-y-1">
            <div className="text-sm">{row.original.eventName || "—"}</div>
            {row.original.eventSlug ? (
              <Badge variant="outline" className="font-mono text-[11px]">
                {row.original.eventSlug}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs">Không rõ nguồn</span>
            )}
          </div>
        ),
        enableSorting: false,
      },
    ];

    const answerColumns: ColumnDef<SrxLadipageRegistration>[] = dynamicColumns.answers.map(([key, label]) => ({
      id: `answer-${key}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
      cell: ({ row }) => (
        <span className="block max-w-[260px] text-sm whitespace-normal">
          {findValue(row.original.answers, key) || "—"}
        </span>
      ),
      enableSorting: false,
    }));

    const customFieldColumns: ColumnDef<SrxLadipageRegistration>[] = dynamicColumns.customFields.map(
      ([key, label]) => ({
        id: `custom-${key}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
        cell: ({ row }) => (
          <span className="block max-w-[220px] text-sm whitespace-normal">
            {findValue(row.original.customFields, key) || "—"}
          </span>
        ),
        enableSorting: false,
      }),
    );

    return [
      ...baseColumns,
      ...answerColumns,
      ...customFieldColumns,
      {
        id: "meta",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Khác" />,
        cell: ({ row }) => (
          <div className="text-muted-foreground min-w-[160px] space-y-1 text-xs">
            {row.original.voucher ? <div>Voucher: {row.original.voucher}</div> : null}
            {row.original.userId ? <div>User ID: {row.original.userId}</div> : null}
            {row.original.pageUrl ? (
              <a href={row.original.pageUrl} target="_blank" rel="noreferrer" className="hover:text-primary underline">
                Trang gửi form
              </a>
            ) : null}
          </div>
        ),
        enableSorting: false,
      },
    ];
  }, [dynamicColumns]);

  const table = useDataTableInstance({
    data: filteredRegistrations,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${selectedSlug}|${searchTerm}|${filteredRegistrations.length}|${columns.length}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Lượt đăng ký sự kiện</h1>
          <p className="text-muted-foreground">
            Dữ liệu form từ các Ladipage sự kiện. Cột câu hỏi hiển thị theo đúng trường tuỳ chỉnh của từng Ladipage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/srx/ladipage-events">
              <LayoutTemplate className="size-4" />
              Quản lý Ladipage
            </Link>
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredRegistrations.length === 0}>
            <Download className="size-4" />
            Xuất CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{registrations.length}</div>
            <p className="text-muted-foreground text-xs">
              {selectedEvent ? `Của Ladipage "${selectedEvent.name}"` : "Toàn bộ Ladipage sự kiện"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đang hiển thị</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{filteredRegistrations.length}</div>
            <p className="text-muted-foreground text-xs">Sau khi lọc theo từ khóa tìm kiếm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trường tuỳ chỉnh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {dynamicColumns.answers.length + dynamicColumns.customFields.length}
            </div>
            <p className="text-muted-foreground text-xs">
              {dynamicColumns.answers.length} câu hỏi · {dynamicColumns.customFields.length} trường ẩn
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, số điện thoại, email, câu trả lời..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedEvent ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/srx/ladipage-events/${selectedEvent.id}/edit`}>
                <ExternalLink className="size-4" />
                Mở Ladipage này
              </Link>
            </Button>
          ) : null}

          <Select value={selectedSlug || "all"} onValueChange={handleEventChange}>
            <SelectTrigger className="w-full min-w-0 md:w-[280px]">
              <SelectValue placeholder="Lọc theo Ladipage" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
              <SelectItem value="all">Tất cả Ladipage</SelectItem>
              {eventOptions.map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-card rounded-xl border p-8">
          <h2 className="text-lg font-semibold">Chưa có lượt đăng ký</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {selectedEvent
              ? `Ladipage "${selectedEvent.name}" chưa nhận được lượt đăng ký nào.`
              : "Chưa có dữ liệu form nào từ các Ladipage sự kiện."}
          </p>
        </div>
      ) : (
        <div className="nice-scroll overflow-hidden rounded-lg">
          <DataTable
            key={tableRenderKey}
            table={table}
            columns={columns}
            headClassName="h-12 px-3 text-sm"
            cellClassName="px-3 py-3 align-top"
          />
        </div>
      )}
    </div>
  );
}
