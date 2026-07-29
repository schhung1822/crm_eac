/* eslint-disable complexity, max-lines */
"use client";

import * as React from "react";

import { Eye, Info, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  srxConnectionCatalog,
  srxConnectionCategoryLabels,
  type SrxConnectionCategory,
  type SrxConnectionDefinition,
  type SrxConnectionId,
  type SrxConnectionState,
} from "@/lib/srx-connections.shared";
import { cn } from "@/lib/utils";

type FilterValue = "all" | SrxConnectionCategory;

const filterTabs: Array<{ value: FilterValue; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "ai", label: "AI" },
  { value: "integration", label: "Tích hợp" },
  { value: "other", label: "Khác" },
];

type UsageReport = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costVnd: number;
  usdToVndRate: number;
  calls: number;
  lastAt: string | null;
  byModel: Array<{ provider: string; model: string; inputTokens: number; outputTokens: number; costUsd: number }>;
};

const emptyUsage: UsageReport = {
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  costVnd: 0,
  usdToVndRate: 0,
  calls: 0,
  lastAt: null,
  byModel: [],
};

function formatTokens(value: number): string {
  return value.toLocaleString("vi-VN");
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function ConnectionLogo({ definition, className }: { definition: SrxConnectionDefinition; className?: string }) {
  return (
    <span
      className={cn(
        "bg-background flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={definition.logo}
        alt={definition.label}
        className="size-6 rounded-[6px] object-contain"
        loading="lazy"
      />
    </span>
  );
}

function StatusBadge({ connection }: { connection: SrxConnectionState }) {
  if (connection.status === "error") {
    return (
      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
        Lỗi
      </Badge>
    );
  }

  if (connection.status === "ok") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        Khả dụng
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
      Đã kết nối
    </Badge>
  );
}

type ConnectionFormState = {
  definition: SrxConnectionDefinition;
  connection: SrxConnectionState;
};

function ConnectionDialog({
  state,
  onClose,
  onSaved,
}: {
  state: ConnectionFormState | null;
  onClose: () => void;
  onSaved: (connection: SrxConnectionState) => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [secret, setSecret] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setValues(state?.connection.values ?? {});
    setSecret("");
  }, [state]);

  if (!state) {
    return null;
  }

  const { definition, connection } = state;

  async function handleSave() {
    try {
      setIsSaving(true);

      const response = await fetch("/api/srx/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: definition.id, secret: secret || undefined, values }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể lưu kết nối");
      }

      onSaved(result.connection as SrxConnectionState);
      toast.success(`Đã lưu kết nối ${definition.label}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu kết nối");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ConnectionLogo definition={definition} />
            {definition.label}
          </DialogTitle>
          <DialogDescription>{definition.summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {definition.secret ? (
            <div className="grid gap-2">
              <Label htmlFor={`${definition.id}-secret`}>{definition.secret.label}</Label>
              {definition.secret.type === "textarea" ? (
                <>
                  <Input
                    type="file"
                    accept="application/json,.json"
                    className="cursor-pointer"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (!file) {
                        return;
                      }

                      void file.text().then((text) => setSecret(text.trim()));
                    }}
                  />
                  <Textarea
                    id={`${definition.id}-secret`}
                    rows={6}
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder={connection.hasSecret ? "Để trống nếu không đổi" : definition.secret.placeholder}
                    className="font-mono text-xs"
                  />
                </>
              ) : (
                <Input
                  id={`${definition.id}-secret`}
                  type="password"
                  autoComplete="off"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder={connection.hasSecret ? "Để trống nếu không đổi" : definition.secret.placeholder}
                />
              )}
              <p className="text-muted-foreground text-xs">
                {connection.hasSecret
                  ? `Hiện tại: ${connection.secretPreview}${connection.secretFromEnv ? " (lấy từ biến môi trường)" : ""}`
                  : "Chưa cấu hình"}
                {definition.secret.hint ? ` — ${definition.secret.hint}` : ""}
              </p>
            </div>
          ) : null}

          {definition.fields.map((field) => (
            <div key={field.key} className="grid gap-2">
              <Label htmlFor={`${definition.id}-${field.key}`}>
                {field.label}
                {field.optional ? <span className="text-muted-foreground font-normal"> (tuỳ chọn)</span> : null}
              </Label>
              <Input
                id={`${definition.id}-${field.key}`}
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              />
              {field.hint ? <p className="text-muted-foreground text-xs">{field.hint}</p> : null}
            </div>
          ))}

          {definition.note ? (
            <div className="bg-muted/50 text-muted-foreground rounded-lg border p-3 text-xs">{definition.note}</div>
          ) : null}

          {definition.envKey ? (
            <p className="text-muted-foreground text-xs">
              Có thể đặt key qua biến môi trường <code className="font-mono">{definition.envKey}</code> thay vì nhập ở
              đây.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Huỷ
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Lưu kết nối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsManager() {
  const [connections, setConnections] = React.useState<SrxConnectionState[]>([]);
  const [usage, setUsage] = React.useState<UsageReport>(emptyUsage);
  const [filter, setFilter] = React.useState<FilterValue>("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<ConnectionFormState | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<SrxConnectionDefinition | null>(null);
  const [testingId, setTestingId] = React.useState<SrxConnectionId | null>(null);
  const [isTestingAll, setIsTestingAll] = React.useState(false);

  const connectionById = React.useMemo(() => {
    return new Map(connections.map((item) => [item.id, item]));
  }, [connections]);

  const loadConnections = React.useCallback(async () => {
    try {
      const response = await fetch("/api/srx/connections");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể tải danh sách kết nối");
      }

      setConnections(result.connections as SrxConnectionState[]);
      setUsage((result.usage as UsageReport | undefined) ?? emptyUsage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải danh sách kết nối");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  function applyConnection(next: SrxConnectionState) {
    setConnections((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  const connectedList = React.useMemo(() => {
    return srxConnectionCatalog
      .map((definition) => ({ definition, connection: connectionById.get(definition.id) }))
      .filter((item): item is { definition: SrxConnectionDefinition; connection: SrxConnectionState } =>
        Boolean(item.connection?.connected),
      );
  }, [connectionById]);

  const counts = React.useMemo(() => {
    const byCategory: Record<SrxConnectionCategory, number> = { ai: 0, integration: 0, other: 0 };

    for (const item of connectedList) {
      byCategory[item.definition.category] += 1;
    }

    return { total: connectedList.length, ...byCategory };
  }, [connectedList]);

  const visibleCatalog = React.useMemo(() => {
    return srxConnectionCatalog.filter((item) => filter === "all" || item.category === filter);
  }, [filter]);

  const visibleConnected = React.useMemo(() => {
    return connectedList.filter((item) => filter === "all" || item.definition.category === filter);
  }, [connectedList, filter]);

  async function handleTest(id: SrxConnectionId) {
    try {
      setTestingId(id);

      const response = await fetch("/api/srx/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể kiểm tra kết nối");
      }

      const connection = result.connection as SrxConnectionState;
      applyConnection(connection);

      if (connection.status === "ok") {
        toast.success(connection.statusMessage || "Kết nối hoạt động");
      } else {
        toast.error(connection.statusMessage || "Kết nối không hoạt động");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể kiểm tra kết nối");
    } finally {
      setTestingId(null);
    }
  }

  async function handleTestAll() {
    setIsTestingAll(true);

    for (const item of connectedList) {
      await handleTest(item.definition.id);
    }

    setIsTestingAll(false);
  }

  async function handleDelete(definition: SrxConnectionDefinition) {
    try {
      const response = await fetch("/api/srx/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: definition.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Không thể xóa kết nối");
      }

      toast.success(`Đã xóa kết nối ${definition.label}`);
      await loadConnections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa kết nối");
    } finally {
      setPendingDelete(null);
    }
  }

  function openEditor(definition: SrxConnectionDefinition) {
    const connection = connectionById.get(definition.id);

    if (!connection) {
      return;
    }

    setEditing({ definition, connection });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý kết nối</h1>
          <p className="text-muted-foreground text-sm">Quản lý API key AI và tích hợp ở một nơi.</p>
        </div>
        <Button onClick={() => openEditor(srxConnectionCatalog[0])} disabled={isLoading}>
          <Plus className="size-4" />
          Thêm kết nối
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Token vào</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">{formatTokens(usage.inputTokens)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Token ra</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">{formatTokens(usage.outputTokens)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Tổng chi phí dự kiến</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {formatUsd(usage.costUsd)} <span className="text-muted-foreground text-2xl">≈</span>{" "}
              <span className="text-2xl text-rose-600 underline decoration-rose-600/40 underline-offset-4 dark:text-rose-400">
                {formatVnd(usage.costVnd)}
              </span>
            </CardTitle>
            {usage.calls > 0 ? (
              <p className="text-muted-foreground text-xs">
                {usage.calls.toLocaleString("vi-VN")} lượt gọi · tỷ giá {usage.usdToVndRate.toLocaleString("vi-VN")}{" "}
                đ/USD
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">Chưa có lượt gọi AI nào được ghi nhận</p>
            )}
          </CardHeader>
        </Card>
      </div>

      {usage.byModel.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiết theo model</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {usage.byModel.map((row) => (
                <li key={`${row.provider}-${row.model}`} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{row.model}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    vào {formatTokens(row.inputTokens)} · ra {formatTokens(row.outputTokens)}
                  </span>
                  <span className="shrink-0 font-medium">{formatUsd(row.costUsd)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={filter === tab.value ? "secondary" : "ghost"}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
            <Badge variant="outline" className="ml-1">
              {tab.value === "all" ? counts.total : counts[tab.value]}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Có thể thêm</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visibleCatalog.map((definition) => {
            const connection = connectionById.get(definition.id);

            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => openEditor(definition)}
                className="hover:border-primary/50 hover:bg-accent/40 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
              >
                <ConnectionLogo definition={definition} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{definition.label}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {srxConnectionCategoryLabels[definition.category]} · {connection?.connected ? "Đã có" : "Thêm"}
                  </span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Đã kết nối</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleTestAll()}
            disabled={isTestingAll || connectedList.length === 0}
            title="Kiểm tra lại tất cả kết nối"
          >
            {isTestingAll ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="sr-only">Kiểm tra lại tất cả</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground p-6 text-sm">Đang tải kết nối...</p>
          ) : visibleConnected.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              Chưa có kết nối nào. Chọn một công cụ ở phần &ldquo;Có thể thêm&rdquo; để bắt đầu.
            </p>
          ) : (
            <ul className="divide-y">
              {visibleConnected.map(({ definition, connection }) => (
                <li key={definition.id} className="flex items-center gap-3 px-6 py-4">
                  <ConnectionLogo definition={definition} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{definition.label}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {srxConnectionCategoryLabels[definition.category]}
                      {connection.values.model ? ` · ${connection.values.model}` : ""}
                      {connection.statusMessage ? ` · ${connection.statusMessage}` : ""}
                    </div>
                  </div>
                  <StatusBadge connection={connection} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleTest(definition.id)}
                    disabled={testingId === definition.id}
                    title="Kiểm tra kết nối"
                  >
                    {testingId === definition.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    <span className="sr-only">Kiểm tra {definition.label}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(definition)}
                    title="Xóa kết nối"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Xóa {definition.label}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConnectionDialog state={editing} onClose={() => setEditing(null)} onSaved={applyConnection} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => (open ? null : setPendingDelete(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kết nối {pendingDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Key và cấu hình của kết nối này sẽ bị xóa khỏi server. Thao tác không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && void handleDelete(pendingDelete)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
