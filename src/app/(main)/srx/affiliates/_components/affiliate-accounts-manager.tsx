/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AffiliateAccountTableCellViewer } from "./affiliate-account-table-cell-viewer";
import {
  formatCurrency,
  formatDateTime,
  getAffiliateAccountStatusLabel,
  getAffiliateAccountStatusVariant,
  getAffiliateApplicationStatusLabel,
  getAffiliateApplicationStatusVariant,
  getAffiliateCommissionLabel,
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingAccountId ? buildUpdatePayload(value) : buildCreatePayload(value)),
    },
  );
  const result = await response.json();

  if (!response.ok) throw new Error(resolveErrorMessage(result));
  return parseSrxAffiliateAccount(result.account);
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
}: {
  label: string;
  value: string;
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
          <div className="mt-0.5 truncate text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-muted-foreground truncate text-xs">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
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
        account.application_social_channel,
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
        if (account.status === "active") result.active += 1;
        return result;
      },
      { total: 0, active: 0, totalOrders: 0, totalPendingCommission: 0, totalApprovedCommission: 0 },
    );
  }, [accounts]);

  const openEditDialog = React.useCallback((account: SrxAffiliateAccount) => {
    setDialogMode("edit");
    setEditingAccount(account);
    setDialogOpen(true);
  }, []);

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
        if (!isEditing) setUserOptions((current) => current.filter((user) => user.id !== account.user_id));
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
          <div className="max-w-64 min-w-0 space-y-1">
            <AffiliateAccountTableCellViewer account={row.original} onEdit={openEditDialog} />
            <div className="text-muted-foreground truncate text-xs">{row.original.user_email}</div>
            <div className="text-muted-foreground truncate text-xs tabular-nums">
              {row.original.affiliate_code} · {row.original.user_phone || "Chưa có SĐT"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1.5">
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
        accessorKey: "total_clicks",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hiệu suất" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm tabular-nums">
            <div className="font-medium">
              {row.original.total_clicks.toLocaleString("vi-VN")} click ·{" "}
              {row.original.total_orders.toLocaleString("vi-VN")} đơn
            </div>
            <div className="text-muted-foreground text-xs">
              {row.original.active_link_count}/{row.original.link_count} link · {row.original.referral_count} ghi nhận
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "approved_commission_amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hoa hồng" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div className="font-semibold tabular-nums">{formatCurrency(row.original.approved_commission_amount)}</div>
            <div className="text-muted-foreground text-xs">
              Chờ: {formatCurrency(row.original.pending_commission_amount)} · Đã chi:{" "}
              {formatCurrency(row.original.paid_commission_amount)}
            </div>
            <div className="text-muted-foreground text-xs">Mức: {getAffiliateCommissionLabel(row.original)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div>{formatDateTime(row.original.updated_at)}</div>
            <div className="text-muted-foreground text-xs">Tạo: {formatDateTime(row.original.created_at)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}>
              <Pencil className="size-4" />
              Chỉnh sửa
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [openEditDialog],
  );

  const table = useDataTableInstance({ data: filteredAccounts, columns, getRowId: (row) => row.id });
  const tableRenderKey = `${searchTerm}|${accountStatusFilter}|${applicationStatusFilter}|${filteredAccounts.length}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Quản lý affiliate</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi tài khoản, hiệu suất, hoa hồng và thông tin thanh toán trong một màn hình.
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="Tổng affiliate"
          value={summary.total.toLocaleString("vi-VN")}
          description="Tất cả tài khoản"
          icon={<UsersRound className="size-5" />}
          iconClassName="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
        <SummaryCard
          label="Đang hoạt động"
          value={summary.active.toLocaleString("vi-VN")}
          description="Có thể ghi nhận đơn"
          icon={<BadgeCheck className="size-5" />}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        />
        <SummaryCard
          label="Đơn affiliate"
          value={summary.totalOrders.toLocaleString("vi-VN")}
          description="Tổng đơn ghi nhận"
          icon={<ShoppingBag className="size-5" />}
          iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        />
        <SummaryCard
          label="Hoa hồng chưa chi"
          value={formatCurrency(summary.totalPendingCommission + summary.totalApprovedCommission)}
          description="Chờ duyệt và đã duyệt"
          icon={<CircleDollarSign className="size-5" />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        />
      </div>

      <div className="bg-card/50 flex flex-col gap-3 rounded-xl border p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md xl:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="bg-background pl-10"
            placeholder="Tìm tên, email, mã affiliate, ngân hàng..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <span className="text-muted-foreground text-xs tabular-nums">
            {filteredAccounts.length.toLocaleString("vi-VN")} / {accounts.length.toLocaleString("vi-VN")} affiliate
          </span>
          <Select
            value={accountStatusFilter}
            onValueChange={(value) => setAccountStatusFilter(value as typeof accountStatusFilter)}
          >
            <SelectTrigger className="bg-background w-full md:w-52">
              <SlidersHorizontal className="size-4" />
              <SelectValue placeholder="Trạng thái tài khoản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tài khoản</SelectItem>
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
            <SelectTrigger className="bg-background w-full md:w-48">
              <SelectValue placeholder="Hồ sơ đăng ký" />
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

      <DataTable
        key={tableRenderKey}
        table={table}
        columns={columns}
        tableClassName="min-w-[980px]"
        headClassName="h-11"
        rowClassName="h-[76px]"
        cellClassName="px-3 py-2.5"
        defaultPageSize={20}
      />

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
