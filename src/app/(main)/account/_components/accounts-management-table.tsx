"use client";

import * as React from "react";

import { PencilLine, RefreshCcw, Search, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ManagedUserAccount } from "@/lib/account-management.shared";
import { ROLE_OPTIONS, getRoleLabel, type AppRole } from "@/lib/rbac";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Chua co";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Khong hop le";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function getRoleBadgeVariant(role: AppRole): "default" | "secondary" | "outline" {
  if (role === "admin") {
    return "default";
  }

  if (role === "store_owner") {
    return "secondary";
  }

  return "outline";
}

export function AccountsManagementTable({
  currentUserId,
  refreshToken,
}: {
  currentUserId: number | null;
  refreshToken: number;
}) {
  const [accounts, setAccounts] = React.useState<ManagedUserAccount[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<ManagedUserAccount | null>(null);
  const [roleDraft, setRoleDraft] = React.useState<AppRole>("user");
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState<ManagedUserAccount | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadAccounts = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/accounts", { cache: "no-store" });
      const result = (await response.json()) as {
        message?: string;
        accounts?: ManagedUserAccount[];
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Khong the tai danh sach tai khoan");
      }

      setAccounts(Array.isArray(result.accounts) ? result.accounts : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai danh sach tai khoan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!currentUserId) {
      return;
    }

    void loadAccounts();
  }, [currentUserId, loadAccounts, refreshToken]);

  const filteredAccounts = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return accounts;
    }

    const keyword = searchTerm.trim().toLowerCase();

    return accounts.filter((account) => {
      const fields = [
        account.username,
        account.email,
        account.name ?? "",
        account.phone ?? "",
        getRoleLabel(account.role),
        account.status ?? "",
      ];

      return fields.some((field) => field.toLowerCase().includes(keyword));
    });
  }, [accounts, searchTerm]);

  const openEditDialog = React.useCallback((account: ManagedUserAccount) => {
    setEditingAccount(account);
    setRoleDraft(account.role);
  }, []);

  const handleUpdateRole = React.useCallback(async () => {
    if (!editingAccount) {
      return;
    }

    setIsUpdatingRole(true);

    try {
      const response = await fetch(`/api/user/accounts/${editingAccount.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: roleDraft }),
      });

      const result = (await response.json()) as {
        message?: string;
        account?: ManagedUserAccount;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Khong the cap nhat quyen tai khoan");
      }

      if (result.account) {
        setAccounts((current) =>
          current.map((account) => (account.id === result.account?.id ? result.account : account)),
        );
      }

      toast.success(result.message ?? "Da cap nhat quyen tai khoan");
      setEditingAccount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the cap nhat quyen tai khoan");
    } finally {
      setIsUpdatingRole(false);
    }
  }, [editingAccount, roleDraft]);

  const handleDeleteAccount = React.useCallback(async () => {
    if (!deletingAccount) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/user/accounts/${deletingAccount.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Khong the xoa tai khoan");
      }

      setAccounts((current) => current.filter((account) => account.id !== deletingAccount.id));
      toast.success(result.message ?? "Da xoa tai khoan");
      setDeletingAccount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa tai khoan");
    } finally {
      setIsDeleting(false);
    }
  }, [deletingAccount]);

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5" />
                Danh sách tài khoản
              </CardTitle>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên, email, role..."
                  className="pl-9"
                />
              </div>

              <Button variant="outline" onClick={() => void loadAccounts()} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isLoading ? "Đang tải..." : "Tải lại"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tài khoản</TableHead>
                  <TableHead>Thông tin liên hệ</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lần đăng nhập cuối</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredAccounts.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                      {isLoading ? "Dang tai danh sach tai khoan..." : "Khong co tai khoan nao phu hop"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="min-w-[220px] align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{account.name || account.username}</span>
                            {account.isCurrentUser ? <Badge variant="outline">Bạn</Badge> : null}
                          </div>
                          <div className="text-muted-foreground text-xs">{account.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px] align-top">
                        <div className="space-y-1 text-sm">
                          <div>{account.email || "Chua co email"}</div>
                          <div className="text-muted-foreground">{account.phone || "Chua co so dien thoai"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={getRoleBadgeVariant(account.role)}>{getRoleLabel(account.role)}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm">{account.status || "Chua dat"}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm">{formatDateTime(account.lastLogin)}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm">{formatDateTime(account.createdAt)}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(account)}
                            disabled={account.isCurrentUser}
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Sửa quyền
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingAccount(account)}
                            disabled={account.isCurrentUser}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-muted-foreground mt-4 flex items-start gap-2 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Neu mot tai khoan dang la admin cuoi cung, he thong se chan thao tac ha quyen hoac xoa de tranh mat quyen
              quan tri.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingAccount)} onOpenChange={(open) => (!open ? setEditingAccount(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cap nhat quyen tai khoan</DialogTitle>
            <DialogDescription>
              {editingAccount
                ? `Dang thay doi vai tro cho ${editingAccount.name || editingAccount.username}.`
                : "Chon vai tro moi cho tai khoan."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="account-role">Vai tro</Label>
              <Select value={roleDraft} onValueChange={(value) => setRoleDraft(value as AppRole)}>
                <SelectTrigger id="account-role">
                  <SelectValue placeholder="Chon vai tro" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)} disabled={isUpdatingRole}>
              Huy
            </Button>
            <Button
              onClick={() => void handleUpdateRole()}
              disabled={isUpdatingRole || !editingAccount || roleDraft === editingAccount.role}
            >
              {isUpdatingRole ? "Dang luu..." : "Luu thay doi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingAccount)} onOpenChange={(open) => (!open ? setDeletingAccount(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoa tai khoan</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingAccount
                ? `Tai khoan ${deletingAccount.name || deletingAccount.username} se bi xoa vinh vien. Hanh dong nay khong the hoan tac.`
                : "Hanh dong nay khong the hoan tac."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Huy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Dang xoa..." : "Xoa tai khoan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
