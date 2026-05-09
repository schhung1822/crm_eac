/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { AffiliateApplicationReviewDialog } from "./affiliate-application-review-dialog";
import {
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

    if (statusWeight !== 0) {
      return statusWeight;
    }

    return right.created_at.getTime() - left.created_at.getTime();
  });
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
        application.affiliate_code,
        application.status,
        application.review_note,
      ]);

      const matchesStatus = statusFilter === "all" || application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const summary = React.useMemo(() => {
    return applications.reduce(
      (result, application) => {
        result.total += 1;

        if (application.status === "pending") {
          result.pending += 1;
        }

        if (application.status === "approved") {
          result.approved += 1;
        }

        if (application.status === "rejected") {
          result.rejected += 1;
        }

        if (application.affiliate_account_id) {
          result.linkedAccounts += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        linkedAccounts: 0,
      },
    );
  }, [applications]);

  const handleSubmit = React.useCallback(
    async (value: SrxAffiliateApplicationReviewMutationInput) => {
      if (!editingApplication) {
        return;
      }

      try {
        setIsSubmitting(true);

        const response = await fetch(`/api/srx/affiliate-applications/${editingApplication.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể cập nhật hồ sơ affiliate");
        }

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
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">
              {row.original.user_name || row.original.legal_full_name || "Chưa cập nhật"}
            </div>
            <div className="text-muted-foreground text-xs">
              {row.original.user_email || row.original.contact_email || "—"}
            </div>
            <div className="text-muted-foreground text-xs">
              {row.original.user_phone || row.original.contact_phone || "—"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "social_channel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kênh quảng bá" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div>{row.original.social_channel || "Chưa cập nhật"}</div>
            <div className="text-muted-foreground line-clamp-1 text-xs">Website: {row.original.website_url || "—"}</div>
            <div className="text-muted-foreground line-clamp-2 text-xs">
              Kế hoạch: {row.original.promotion_plan || "Chưa có mô tả"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "affiliate_code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Liên kết affiliate" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <div className="font-medium">{row.original.affiliate_code || "Chưa liên kết"}</div>
            {row.original.affiliate_account_status ? (
              <Badge variant={getAffiliateAccountStatusVariant(row.original.affiliate_account_status)}>
                {getAffiliateAccountStatusLabel(row.original.affiliate_account_status)}
              </Badge>
            ) : (
              <div className="text-muted-foreground text-xs">Chưa có affiliate account</div>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái hồ sơ" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <Badge variant={getAffiliateApplicationStatusVariant(row.original.status)}>
              {getAffiliateApplicationStatusLabel(row.original.status)}
            </Badge>
            <div className="text-muted-foreground line-clamp-2 text-xs">
              {row.original.review_note || row.original.reviewed_by_user_name || "Chưa có ghi chú duyệt"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div>Tạo: {formatDateTime(row.original.created_at)}</div>
            <div className="text-muted-foreground text-xs">Duyệt: {formatDateTime(row.original.reviewed_at)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingApplication(row.original);
                setDialogOpen(true);
              }}
            >
              Xem duyệt
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: filteredApplications,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Phê duyệt hồ sơ affiliate</h1>
        <p className="text-muted-foreground">
          Theo dõi và duyệt các hồ sơ đăng ký affiliate lấy trực tiếp từ bảng affiliate_applications của website SRX.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng hồ sơ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.total}</div>
            <p className="text-muted-foreground text-xs">Toàn bộ hồ sơ đăng ký affiliate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.pending}</div>
            <p className="text-muted-foreground text-xs">Cần admin xử lý trong hàng đợi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.approved}</div>
            <p className="text-muted-foreground text-xs">Hồ sơ đã kích hoạt affiliate cho người dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đã liên kết account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.linkedAccounts}</div>
            <p className="text-muted-foreground text-xs">Hồ sơ đã có bản ghi affiliate account</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, email, điện thoại, kênh..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Lọc trạng thái hồ sơ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái hồ sơ</SelectItem>
              {srxAffiliateApplicationStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {getAffiliateApplicationStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable table={table} columns={columns} />
      </div>

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
