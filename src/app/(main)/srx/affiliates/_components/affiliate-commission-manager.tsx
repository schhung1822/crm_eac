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
  parseSrxAffiliateAccount,
  srxAffiliateAccountStatusValues,
  srxAffiliateCommissionTypeValues,
  type SrxAffiliateAccount,
  type SrxAffiliateCommissionMutationInput,
} from "@/lib/srx-affiliates.shared";

import { AffiliateCommissionDialog } from "./affiliate-commission-dialog";
import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateCommissionLabel,
  getAffiliateCommissionTypeLabel,
  getAffiliatePayoutStatusLabel,
  getAffiliatePayoutStatusVariant,
} from "./affiliate-presenters";

function sortAffiliateAccounts(accounts: SrxAffiliateAccount[]): SrxAffiliateAccount[] {
  return [...accounts].sort((left, right) => {
    if (left.pending_commission_amount !== right.pending_commission_amount) {
      return right.pending_commission_amount - left.pending_commission_amount;
    }

    return right.created_at.getTime() - left.created_at.getTime();
  });
}

export function AffiliateCommissionManager({ initialAccounts }: { initialAccounts: SrxAffiliateAccount[] }) {
  const [accounts, setAccounts] = React.useState<SrxAffiliateAccount[]>(sortAffiliateAccounts(initialAccounts));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [accountStatusFilter, setAccountStatusFilter] = React.useState<"all" | SrxAffiliateAccount["status"]>("all");
  const [commissionTypeFilter, setCommissionTypeFilter] = React.useState<
    "all" | SrxAffiliateAccount["commission_type"]
  >("all");
  const [editingAccount, setEditingAccount] = React.useState<SrxAffiliateAccount | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = matchesSearchTerm(searchTerm, [
        account.user_name,
        account.user_email,
        account.affiliate_code,
      ]);
      const matchesStatus = accountStatusFilter === "all" || account.status === accountStatusFilter;
      const matchesCommissionType = commissionTypeFilter === "all" || account.commission_type === commissionTypeFilter;

      return matchesSearch && matchesStatus && matchesCommissionType;
    });
  }, [accounts, accountStatusFilter, commissionTypeFilter, searchTerm]);

  const summary = React.useMemo(() => {
    return accounts.reduce(
      (result, account) => {
        result.totalClicks += account.total_clicks;
        result.totalOrders += account.total_orders;
        result.totalPending += account.pending_commission_amount + account.approved_commission_amount;
        result.totalPaid += account.paid_commission_amount;
        result.totalPaidOut += account.paid_out_amount;
        return result;
      },
      {
        totalClicks: 0,
        totalOrders: 0,
        totalPending: 0,
        totalPaid: 0,
        totalPaidOut: 0,
      },
    );
  }, [accounts]);

  const handleSubmit = React.useCallback(
    async (value: SrxAffiliateCommissionMutationInput) => {
      if (!editingAccount) {
        return;
      }

      try {
        setIsSubmitting(true);

        const response = await fetch(`/api/srx/affiliate-accounts/${editingAccount.id}/commission`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể cập nhật thiết lập hoa hồng");
        }

        const account = parseSrxAffiliateAccount(result.account);
        setAccounts((current) =>
          sortAffiliateAccounts(current.map((item) => (item.id === account.id ? account : item))),
        );
        setDialogOpen(false);
        setEditingAccount(null);
        toast.success("Đã cập nhật thiết lập hoa hồng");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật thiết lập hoa hồng");
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
          <Badge variant={getAffiliateAccountStatusVariant(row.original.status)}>
            {getAffiliateAccountStatusLabel(row.original.status)}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "commission_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thiết lập" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{getAffiliateCommissionTypeLabel(row.original.commission_type)}</div>
            <div className="text-muted-foreground text-xs">{getAffiliateCommissionLabel(row.original)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "cookie_duration_days",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cookie / Hiệu suất" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>Cookie: {row.original.cookie_duration_days} ngày</div>
            <div className="text-muted-foreground text-xs">
              Click {row.original.total_clicks} · Đơn {row.original.total_orders}
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
        accessorKey: "latest_payout_status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Chi trả" />,
        cell: ({ row }) => (
          <div className="space-y-2">
            <Badge variant={getAffiliatePayoutStatusVariant(row.original.latest_payout_status)}>
              {getAffiliatePayoutStatusLabel(row.original.latest_payout_status)}
            </Badge>
            <div className="text-muted-foreground text-xs">Đã trả: {formatCurrency(row.original.paid_out_amount)}</div>
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
              Thiết lập
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
  const tableRenderKey = `${searchTerm}|${accountStatusFilter}|${commissionTypeFilter}|${filteredAccounts.length}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Thiết lập hoa hồng</h1>
        <p className="text-muted-foreground">
          Điều chỉnh mức hoa hồng, loại tính thưởng và thời gian lưu cookie cho từng affiliate trên website SRX.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng click</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalClicks}</div>
            <p className="text-muted-foreground text-xs">Lượt click affiliate ghi nhận từ toàn hệ thống</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đơn có affiliate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalOrders}</div>
            <p className="text-muted-foreground text-xs">Đơn hàng đã được gắn cho affiliate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hoa hồng chưa chi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(summary.totalPending)}</div>
            <p className="text-muted-foreground text-xs">Bao gồm hoa hồng chờ duyệt và đã duyệt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đã chi thực tế</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(summary.totalPaidOut || summary.totalPaid)}</div>
            <p className="text-muted-foreground text-xs">Tổng tiền hoa hồng đã chi trả cho affiliate</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, email hoặc mã affiliate..."
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
            value={commissionTypeFilter}
            onValueChange={(value) => setCommissionTypeFilter(value as typeof commissionTypeFilter)}
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Lọc loại hoa hồng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại hoa hồng</SelectItem>
              {srxAffiliateCommissionTypeValues.map((commissionType) => (
                <SelectItem key={commissionType} value={commissionType}>
                  {getAffiliateCommissionTypeLabel(commissionType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>

      <AffiliateCommissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editingAccount}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
