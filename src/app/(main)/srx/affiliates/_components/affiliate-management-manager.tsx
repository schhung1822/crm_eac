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
import {
  parseSrxAffiliateAccount,
  srxAffiliateAccountStatusValues,
  srxAffiliateApplicationStatusValues,
  type SrxAffiliateAccount,
  type SrxAffiliateManagementMutationInput,
} from "@/lib/srx-affiliates.shared";

import { AffiliateManagementDialog } from "./affiliate-management-dialog";
import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
} from "./affiliate-presenters";

function sortAffiliateAccounts(accounts: SrxAffiliateAccount[]): SrxAffiliateAccount[] {
  return [...accounts].sort((left, right) => right.created_at.getTime() - left.created_at.getTime());
}

export function AffiliateManagementManager({ initialAccounts }: { initialAccounts: SrxAffiliateAccount[] }) {
  const [accounts, setAccounts] = React.useState<SrxAffiliateAccount[]>(sortAffiliateAccounts(initialAccounts));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [accountStatusFilter, setAccountStatusFilter] = React.useState<"all" | SrxAffiliateAccount["status"]>("all");
  const [applicationStatusFilter, setApplicationStatusFilter] = React.useState<
    "all" | "missing" | NonNullable<SrxAffiliateAccount["application_status"]>
  >("all");
  const [editingAccount, setEditingAccount] = React.useState<SrxAffiliateAccount | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = searchTerm.trim()
        ? [
            account.user_name,
            account.user_email,
            account.user_phone,
            account.affiliate_code,
            account.bank_name,
            account.application_contact_email,
            account.application_contact_phone,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;

      const matchesAccountStatus = accountStatusFilter === "all" || account.status === accountStatusFilter;
      const matchesApplicationStatus =
        applicationStatusFilter === "all"
          ? true
          : applicationStatusFilter === "missing"
            ? account.application_status === null
            : account.application_status === applicationStatusFilter;

      return matchesSearch && matchesAccountStatus && matchesApplicationStatus;
    });
  }, [accounts, accountStatusFilter, applicationStatusFilter, searchTerm]);

  const summary = React.useMemo(() => {
    return accounts.reduce(
      (result, account) => {
        result.total += 1;
        result.totalPendingCommission += account.pending_commission_amount;
        result.totalApprovedCommission += account.approved_commission_amount;

        if (account.status === "active") {
          result.active += 1;
        }

        if (account.application_status === "pending") {
          result.pendingApplications += 1;
        }

        return result;
      },
      {
        total: 0,
        active: 0,
        pendingApplications: 0,
        totalPendingCommission: 0,
        totalApprovedCommission: 0,
      },
    );
  }, [accounts]);

  const handleSubmit = React.useCallback(
    async (value: SrxAffiliateManagementMutationInput) => {
      if (!editingAccount) {
        return;
      }

      try {
        setIsSubmitting(true);

        const response = await fetch(`/api/srx/affiliate-accounts/${editingAccount.id}/management`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể cập nhật affiliate");
        }

        const account = parseSrxAffiliateAccount(result.account);
        setAccounts((current) =>
          sortAffiliateAccounts(current.map((item) => (item.id === account.id ? account : item))),
        );
        setDialogOpen(false);
        setEditingAccount(null);
        toast.success("Đã cập nhật affiliate");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật affiliate");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingAccount],
  );

  const columns = React.useMemo<ColumnDef<SrxAffiliateAccount>[]>(
    () => [
      {
        accessorKey: "affiliate_code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Affiliate" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.user_name}</div>
            <div className="text-muted-foreground text-xs">{row.original.user_email}</div>
            <div className="text-muted-foreground text-xs">Mã: {row.original.affiliate_code}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <Badge variant={getAffiliateAccountStatusVariant(row.original.status)}>
              {getAffiliateAccountStatusLabel(row.original.status)}
            </Badge>
            <div className="text-muted-foreground text-xs">
              Duyệt lúc: {row.original.approved_at ? formatDateTime(row.original.approved_at) : "—"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "application_status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hồ sơ" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <Badge variant={getAffiliateApplicationStatusVariant(row.original.application_status)}>
              {getAffiliateApplicationStatusLabel(row.original.application_status)}
            </Badge>
            <div className="text-muted-foreground line-clamp-2 text-xs">
              {row.original.application_review_note || row.original.application_social_channel || "Không có ghi chú"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "total_clicks",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hiệu suất" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>Click: {row.original.total_clicks}</div>
            <div>Đơn: {row.original.total_orders}</div>
            <div className="text-muted-foreground text-xs">
              Link hoạt động: {row.original.active_link_count}/{row.original.link_count}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "pending_commission_amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hoa hồng" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>Chờ duyệt: {formatCurrency(row.original.pending_commission_amount)}</div>
            <div>Đã duyệt: {formatCurrency(row.original.approved_commission_amount)}</div>
            <div className="text-muted-foreground text-xs">
              Đã chi: {formatCurrency(row.original.paid_commission_amount)}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "bank_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ngân hàng" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div>{row.original.bank_name || "Chưa cấu hình"}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.bank_account_holder || "—"}{" "}
              {row.original.bank_account_number ? `· ${row.original.bank_account_number}` : ""}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => <span>{formatDateTime(row.original.updated_at)}</span>,
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
                setEditingAccount(row.original);
                setDialogOpen(true);
              }}
            >
              Cập nhật
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: filteredAccounts,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý affiliate</h1>
        <p className="text-muted-foreground">
          Theo dõi trạng thái tài khoản affiliate, hồ sơ đăng ký, ngân hàng nhận hoa hồng và hiệu suất bán hàng của
          website SRX.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng affiliate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.total}</div>
            <p className="text-muted-foreground text-xs">Toàn bộ tài khoản affiliate hiện có</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.active}</div>
            <p className="text-muted-foreground text-xs">Tài khoản đang có thể ghi nhận đơn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hồ sơ chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.pendingApplications}</div>
            <p className="text-muted-foreground text-xs">Cần kiểm tra lại hồ sơ affiliate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hoa hồng chờ xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(summary.totalPendingCommission + summary.totalApprovedCommission)}
            </div>
            <p className="text-muted-foreground text-xs">Tổng hoa hồng chưa chi cho affiliate</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, email, mã affiliate, ngân hàng..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Select
            value={accountStatusFilter}
            onValueChange={(value) => setAccountStatusFilter(value as typeof accountStatusFilter)}
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Lọc trạng thái tài khoản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái tài khoản</SelectItem>
              {srxAffiliateAccountStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {getAffiliateAccountStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={applicationStatusFilter}
            onValueChange={(value) => setApplicationStatusFilter(value as typeof applicationStatusFilter)}
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Lọc hồ sơ đăng ký" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả hồ sơ</SelectItem>
              <SelectItem value="missing">Không có hồ sơ</SelectItem>
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

      <AffiliateManagementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editingAccount}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
