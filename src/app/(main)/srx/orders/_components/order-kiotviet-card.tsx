"use client";

import * as React from "react";

import { Eye, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseSrxKiotVietOrderSync, type SrxKiotVietOrderSync } from "@/lib/srx-kiotviet-orders.shared";

const moneyFormatter = new Intl.NumberFormat("vi-VN");

type PreviewDetail = { productCode: string; productName: string; quantity: number; price: number };
type Preview = {
  customerNote: string;
  warnings: string[];
  payload: {
    orderDetails: PreviewDetail[];
    discount: number;
    description: string;
    soldByName: string;
    SaleChannelName: string;
  };
};

const statusView: Record<
  SrxKiotVietOrderSync["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  synced: { label: "Đã đồng bộ", variant: "default" },
  processing: { label: "Đang gửi", variant: "secondary" },
  failed: { label: "Lỗi", variant: "destructive" },
};

function PreviewDialog({
  onOpenChange,
  open,
  preview,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  preview: Preview | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dữ liệu sẽ gửi KiotViet</DialogTitle>
          <DialogDescription>Chi nhánh EAC HCM. {preview?.customerNote}</DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="grid gap-3 text-sm">
            <div className="divide-y rounded-md border">
              {preview.payload.orderDetails.map((detail, index) => (
                <div
                  key={`${detail.productCode}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate">{detail.productName}</span>
                    <span className="text-muted-foreground font-mono text-xs">{detail.productCode}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {detail.quantity} × {moneyFormatter.format(detail.price)}đ
                  </span>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground grid gap-1 text-xs">
              <span>
                Giảm giá đơn: {moneyFormatter.format(preview.payload.discount)}đ · Người bán:{" "}
                {preview.payload.soldByName} · Kênh bán: {preview.payload.SaleChannelName}
              </span>
              <span className="break-words">Ghi chú: {preview.payload.description}</span>
            </div>
            {preview.warnings.length > 0 ? (
              <ul className="text-destructive list-disc space-y-1 pl-5 text-xs">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SyncStatusBadge({ sync }: { sync: SrxKiotVietOrderSync | null }) {
  if (!sync) {
    return <Badge variant="outline">Chưa gửi</Badge>;
  }

  return <Badge variant={statusView[sync.status].variant}>{statusView[sync.status].label}</Badge>;
}

function SyncDetails({ sync }: { sync: SrxKiotVietOrderSync }) {
  return (
    <CardContent className="grid gap-2 text-sm">
      {sync.status === "synced" ? (
        <div>
          Mã đơn KiotViet: <span className="font-mono font-medium">{sync.kiotviet_order_code}</span>
          {sync.synced_at ? (
            <span className="text-muted-foreground"> · {sync.synced_at.toLocaleString("vi-VN")}</span>
          ) : null}
        </div>
      ) : null}
      {sync.error_message ? <div className="text-destructive break-words">{sync.error_message}</div> : null}
      {sync.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-400">
          {sync.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <div className="text-muted-foreground text-xs">Số lần gửi: {sync.attempt_count}</div>
    </CardContent>
  );
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, result };
}

export function OrderKiotVietCard({
  initialSync,
  orderId,
}: {
  initialSync: SrxKiotVietOrderSync | null;
  orderId: string;
}) {
  const [sync, setSync] = React.useState(initialSync);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<"preview" | "sync" | null>(null);

  async function handlePreview() {
    setBusyAction("preview");
    const { ok, result } = await requestJson(`/api/srx/orders/${orderId}/kiotviet`);
    setBusyAction(null);

    if (!ok) {
      toast.error(result?.message ?? "Không thể dựng dữ liệu gửi KiotViet");
      return;
    }

    setPreview(result.preview as Preview);
    setIsPreviewOpen(true);
  }

  async function handleSync() {
    setBusyAction("sync");
    const { ok, result } = await requestJson(`/api/srx/orders/${orderId}/kiotviet`, { method: "POST" });
    setBusyAction(null);

    if (result?.sync) {
      setSync(parseSrxKiotVietOrderSync(result.sync));
    }

    if (ok) {
      toast.success(result.message ?? "Đã gửi đơn lên KiotViet");
    } else {
      toast.error(result?.message ?? "Không thể gửi đơn lên KiotViet");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          KiotViet
          <SyncStatusBadge sync={sync} />
        </CardTitle>
        <CardDescription>
          Đơn website được tự đẩy về KiotViet (chi nhánh EAC HCM, kênh Website SRX) ngay khi khách đặt.
        </CardDescription>
        <CardAction className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyAction !== null}
            onClick={() => void handlePreview()}
          >
            {busyAction === "preview" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            Xem dữ liệu
          </Button>
          {sync?.status === "synced" ? null : (
            <Button type="button" size="sm" disabled={busyAction !== null} onClick={() => void handleSync()}>
              {busyAction === "sync" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sync ? "Gửi lại" : "Gửi lên KiotViet"}
            </Button>
          )}
        </CardAction>
      </CardHeader>

      {sync ? <SyncDetails sync={sync} /> : null}

      <PreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} preview={preview} />
    </Card>
  );
}
