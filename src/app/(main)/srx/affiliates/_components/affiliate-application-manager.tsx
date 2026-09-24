/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Clock3, Eye, Search, UserRoundCheck, UsersRound, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { matchesSearchTerm } from "@/lib/search-utils";
import {
  parseSrxAffiliateApplication,
  srxAffiliateApplicationStatusValues,
  type SrxAffiliateApplication,
  type SrxAffiliateApplicationReviewMutationInput,
} from "@/lib/srx-affiliates.shared";
import { getInitials } from "@/lib/utils";

import { AffiliateApplicationReviewDialog } from "./affiliate-application-review-dialog";
import {
  formatDatabaseLocalDateTime,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
} from "./affiliate-presenters";

function getApplicationSortWeight(status: SrxAffiliateApplication["status"]): number {
  switch (status) {
    case "pending":
      return 0;
    case "rejected":
      return 1;
    case "approved":
      return 2;
    default:
      return 99;
  }
}

function sortAffiliateApplications(applications: SrxAffiliateApplication[]): SrxAffiliateApplication[] {
  return [...applications].sort((left, right) => {
    const statusWeight = getApplicationSortWeight(left.status) - getApplicationSortWeight(right.status);
    return statusWeight || right.created_at.getTime() - left.created_at.getTime();
  });
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-xs font-medium">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value.toLocaleString("vi-VN")}</div>
          <div className="text-muted-foreground truncate text-xs">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AffiliateApplicationManager({
  initialApplications,
}: {
  initialApplications: SrxAffiliateApplication[];
}) {
  const [applications, setApplications] = React.useState<SrxAffiliateApplication[]>(
    sortAffiliateApplications(initialApplications),
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | SrxAffiliateApplication["status"]>("all");
  const [editingApplication, setEditingApplication] = React.useState<SrxAffiliateApplication | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredApplications = React.useMemo(() => {
    return applications.filter((application) => {
      const matchesSearch = matchesSearchTerm(searchTerm, [
        application.user_name,
        application.user_email,
        application.user_phone,
        application.legal_full_name,
        application.contact_email,
        application.contact_phone,
        application.social_channel,
        application.website_url,
        application.facebook_url,
        application.tiktok_url,
        application.affiliate_code,
      ]);
      return matchesSearch && (statusFilter === "all" || application.status === statusFilter);
    });
  }, [applications, searchTerm, statusFilter]);

  const summary = React.useMemo(() => {
    return applications.reduce(
      (result, application) => {
        result.total += 1;
        result[application.status] += 1;
        if (application.affiliate_account_id) result.linkedAccounts += 1;
        return result;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, linkedAccounts: 0 },
    );
  }, [applications]);

  const handleSubmit = React.useCallback(
    async (value: SrxAffiliateApplicationReviewMutationInput) => {
      if (!editingApplication) return;

      try {
        setIsSubmitting(true);
        const response = await fetch(`/api/srx/affiliate-applications/${editingApplication.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result?.message ?? "Không thể cập nhật hồ sơ affiliate");

        const application = parseSrxAffiliateApplication(result.application);
        setApplications((current) =>
          sortAffiliateApplications(current.map((item) => (item.id === application.id ? application : item))),
        );
        setDialogOpen(false);
        setEditingApplication(null);
        toast.success("Đã cập nhật hồ sơ affiliate");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ affiliate");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingApplication],
  );

  const columns = React.useMemo<ColumnDef<SrxAffiliateApplication>[]>(
    () => [
      {
        accessorKey: "user_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Người đăng ký" />,
        cell: ({ row }) => {
          const name = row.original.user_name || row.original.legal_full_name || "Chưa cập nhật";
          return (
            <div className="flex max-w-64 min-w-0 items-center gap-3">
              <Avatar className="size-9 shrink-0 border">
                <AvatarImage src="/avatars/avatar.webp" alt={name} />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <div className="truncate font-medium" title={name}>
                  {name}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {row.original.user_email || row.original.contact_email || "—"}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {row.original.user_phone || row.original.contact_phone || "—"}
                </div>
              </div>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "social_channel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kênh quảng bá" />,
        cell: ({ row }) => (
          <div className="max-w-60 min-w-0 space-y-1">
            <div className="truncate font-medium">{row.original.social_channel || "Chưa cập nhật"}</div>
            <div className="text-muted-foreground truncate text-xs" title={row.original.website_url}>
              {row.original.website_url || "Chưa có website"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <div className="space-y-1.5">
            <Badge variant={getAffiliateApplicationStatusVariant(row.original.status)}>
              {getAffiliateApplicationStatusLabel(row.original.status)}
            </Badge>
            {row.original.affiliate_account_status ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <Badge variant={getAffiliateAccountStatusVariant(row.original.affiliate_account_status)}>
                  {getAffiliateAccountStatusLabel(row.original.affiliate_account_status)}
                </Badge>
                <span className="text-muted-foreground max-w-28 truncate text-xs" title={row.original.affiliate_code}>
                  {row.original.affiliate_code}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">Chưa có tài khoản affiliate</div>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div>{formatDatabaseLocalDateTime(row.original.created_at)}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.reviewed_at ? `Duyệt: ${formatDateTime(row.original.reviewed_at)}` : "Chưa xử lý"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingApplication(row.original);
                setDialogOpen(true);
              }}
            >
              <Eye className="size-4" />
              Xem hồ sơ
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: filteredApplications,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${searchTerm}|${statusFilter}|${filteredApplications.length}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Phê duyệt hồ sơ affiliate</h1>
        <p className="text-muted-foreground text-sm">Kiểm tra hồ sơ đăng ký và kích hoạt tài khoản affiliate SRX.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="Tổng hồ sơ"
          value={summary.total}
          description="Tất cả đăng ký"
          icon={<UsersRound className="size-5" />}
          iconClassName="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
        <SummaryCard
          label="Chờ duyệt"
          value={summary.pending}
          description="Cần xử lý"
          icon={<Clock3 className="size-5" />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        />
        <SummaryCard
          label="Đã duyệt"
          value={summary.approved}
          description={`${summary.linkedAccounts} tài khoản đã liên kết`}
          icon={<BadgeCheck className="size-5" />}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        />
        <SummaryCard
          label="Từ chối"
          value={summary.rejected}
          description="Hồ sơ chưa đạt"
          icon={<XCircle className="size-5" />}
          iconClassName="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        />
      </div>

      <div className="bg-card/50 flex flex-col gap-3 rounded-xl border p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md lg:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="bg-background pl-10"
            placeholder="Tìm tên, email, điện thoại, kênh..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-muted-foreground text-xs tabular-nums">
            {filteredApplications.length.toLocaleString("vi-VN")} / {applications.length.toLocaleString("vi-VN")} hồ sơ
          </span>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="bg-background w-full sm:w-52">
              <UserRoundCheck className="size-4" />
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {srxAffiliateApplicationStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {getAffiliateApplicationStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        key={tableRenderKey}
        table={table}
        columns={columns}
        tableClassName="min-w-[880px]"
        headClassName="h-11"
        rowClassName="h-[72px]"
        cellClassName="px-3 py-2.5"
        defaultPageSize={20}
      />

      <AffiliateApplicationReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editingApplication}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
