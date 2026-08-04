/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
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
  srxAffiliateApplicationStatusValues,
  type SrxAffiliateAccount,
  type SrxAffiliateUserOption,
} from "@/lib/srx-affiliates.shared";

import { AffiliateAccountFormDialog, type AffiliateAccountFormState } from "./affiliate-account-form-dialog";
import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
  getAffiliateCommissionLabel,
  getAffiliateCommissionTypeLabel,
} from "./affiliate-presenters";

function sortAffiliateAccounts(accounts: SrxAffiliateAccount[]): SrxAffiliateAccount[] {
  return [...accounts].sort((left, right) => right.created_at.getTime() - left.created_at.getTime());
}

function buildCreatePayload(value: AffiliateAccountFormState) {
  return {
    user_mode: value.user_mode,
    user_id: value.user_id,
    new_user_full_name: value.new_user_full_name,
    new_user_email: value.new_user_email,
    new_user_phone: value.new_user_phone,
    new_user_password: value.new_user_password,
    ...buildSharedPayload(value),
  };
}

function buildUpdatePayload(value: AffiliateAccountFormState) {
  return {
    user_full_name: value.user_full_name,
    user_email: value.user_email,
    user_phone: value.user_phone,
    ...buildSharedPayload(value),
  };
}

function buildSharedPayload(value: AffiliateAccountFormState) {
  return {
    affiliate_code: value.affiliate_code,
    status: value.status,
    commission_type: value.commission_type,
    commission_rate: value.commission_rate,
    cookie_duration_days: value.cookie_duration_days,
    application_status: value.application_status,
    review_note: value.review_note,
    legal_full_name: value.legal_full_name,
    permanent_address: value.permanent_address,
    national_id_number: value.national_id_number,
    gender: value.gender,
    contact_email: value.contact_email,
    contact_phone: value.contact_phone,
    social_channel: value.social_channel,
    website_url: value.website_url,
    facebook_url: value.facebook_url,
    tiktok_url: value.tiktok_url,
    promotion_plan: value.promotion_plan,
    bank_account_holder: value.bank_account_holder,
    bank_name: value.bank_name,
    bank_branch: value.bank_branch,
    bank_account_number: value.bank_account_number,
  };
}

function resolveErrorMessage(result: { message?: string; issues?: Array<{ message?: string }> }): string {
  const issueMessage = Array.isArray(result.issues) ? result.issues[0]?.message : null;

  return issueMessage ?? result.message ?? "Không thể lưu affiliate";
}

async function submitAffiliateAccount(
  editingAccountId: string | null,
  value: AffiliateAccountFormState,
): Promise<SrxAffiliateAccount> {
  const response = await fetch(
    editingAccountId ? `/api/srx/affiliate-accounts/${editingAccountId}` : "/api/srx/affiliate-accounts",
    {
      method: editingAccountId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editingAccountId ? buildUpdatePayload(value) : buildCreatePayload(value)),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(resolveErrorMessage(result));
  }

  return parseSrxAffiliateAccount(result.account);
}

export function AffiliateAccountsManager({
  initialAccounts,
  initialUserOptions,
}: {
  initialAccounts: SrxAffiliateAccount[];
  initialUserOptions: SrxAffiliateUserOption[];
}) {
  const [accounts, setAccounts] = React.useState<SrxAffiliateAccount[]>(sortAffiliateAccounts(initialAccounts));
  const [userOptions, setUserOptions] = React.useState<SrxAffiliateUserOption[]>(initialUserOptions);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [accountStatusFilter, setAccountStatusFilter] = React.useState<"all" | SrxAffiliateAccount["status"]>("all");
  const [applicationStatusFilter, setApplicationStatusFilter] = React.useState<
    "all" | "missing" | NonNullable<SrxAffiliateAccount["application_status"]>
  >("all");
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("edit");
  const [editingAccount, setEditingAccount] = React.useState<SrxAffiliateAccount | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = matchesSearchTerm(searchTerm, [
        account.user_name,
        account.user_email,
        account.user_phone,
        account.affiliate_code,
        account.bank_name,
        account.bank_account_number,
        account.application_contact_email,
        account.application_contact_phone,
        account.application_legal_full_name,
      ]);

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
        result.totalOrders += account.total_orders;

        if (account.status === "active") {
          result.active += 1;
        }

        return result;
      },
      {
        total: 0,
        active: 0,
        totalOrders: 0,
        totalPendingCommission: 0,
        totalApprovedCommission: 0,
      },
    );
  }, [accounts]);

  const handleSubmit = React.useCallback(
    async (value: AffiliateAccountFormState) => {
      const editingAccountId = dialogMode === "edit" && editingAccount ? editingAccount.id : null;
      const isEditing = editingAccountId !== null;

      try {
        setIsSubmitting(true);

        const account = await submitAffiliateAccount(editingAccountId, value);

        setAccounts((current) =>
          sortAffiliateAccounts(
            isEditing ? current.map((item) => (item.id === account.id ? account : item)) : [...current, account],
          ),
        );

        if (!isEditing) {
          setUserOptions((current) => current.filter((user) => user.id !== account.user_id));
        }

        setDialogOpen(false);
        setEditingAccount(null);
        toast.success(isEditing ? "Đã cập nhật affiliate" : "Đã tạo affiliate mới");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu affiliate");
      } finally {
        setIsSubmitting(false);
      }
    },
    [dialogMode, editingAccount],
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
            <div className="text-muted-foreground text-xs">
              {row.original.user_phone ? `${row.original.user_phone} · ` : ""}Mã: {row.original.affiliate_code}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={getAffiliateAccountStatusVariant(row.original.status)}>
              {getAffiliateAccountStatusLabel(row.original.status)}
            </Badge>
            <Badge variant={getAffiliateApplicationStatusVariant(row.original.application_status)}>
              {getAffiliateApplicationStatusLabel(row.original.application_status)}
            </Badge>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "commission_rate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hoa hồng" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium">{getAffiliateCommissionLabel(row.original)}</div>
            <div className="text-muted-foreground text-xs">
              {getAffiliateCommissionTypeLabel(row.original.commission_type)} · cookie{" "}
              {row.original.cookie_duration_days} ngày
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
            <div>
              {row.original.total_clicks} click · {row.original.total_orders} đơn
            </div>
            <div className="text-muted-foreground text-xs">
              Link: {row.original.active_link_count}/{row.original.link_count} · Đơn ghi nhận:{" "}
              {row.original.referral_count}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "pending_commission_amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Số dư hoa hồng" />,
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
              {row.original.bank_account_holder || "—"}
              {row.original.bank_account_number ? ` · ${row.original.bank_account_number}` : ""}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.updated_at)}</span>,
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
                setDialogMode("edit");
                setEditingAccount(row.original);
                setDialogOpen(true);
              }}
            >
              Chỉnh sửa
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
  const tableRenderKey = `${searchTerm}|${accountStatusFilter}|${applicationStatusFilter}|${filteredAccounts.length}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý affiliate</h1>
          <p className="text-muted-foreground">
            Tạo affiliate mới, chỉnh sửa thông tin cá nhân, hoa hồng và tài khoản ngân hàng trong cùng một nơi.
          </p>
        </div>

        <Button
          onClick={() => {
            setDialogMode("create");
            setEditingAccount(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Thêm affiliate
        </Button>
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
            <CardTitle className="text-sm font-medium">Đơn qua affiliate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalOrders}</div>
            <p className="text-muted-foreground text-xs">Tổng đơn ghi nhận cho toàn hệ thống affiliate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hoa hồng chưa chi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(summary.totalPendingCommission + summary.totalApprovedCommission)}
            </div>
            <p className="text-muted-foreground text-xs">Gồm hoa hồng chờ duyệt và đã duyệt</p>
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
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>

      <AffiliateAccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialValue={editingAccount}
        userOptions={userOptions}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
