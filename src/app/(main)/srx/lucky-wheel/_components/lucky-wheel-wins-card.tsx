"use client";

import * as React from "react";

import { History, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  parseSrxLuckyWheelSpin,
  srxLuckyWheelPrizeTypeLabels,
  type SrxLuckyWheelSpin,
  type SrxLuckyWheelZbsStatus,
} from "@/lib/srx-lucky-wheel.shared";

const zbsStatusLabels: Record<
  SrxLuckyWheelZbsStatus,
  { label: string; tone: "default" | "secondary" | "destructive" }
> = {
  none: { label: "Không gửi", tone: "secondary" },
  pending: { label: "Chờ gửi", tone: "secondary" },
  sending: { label: "Đang gửi", tone: "secondary" },
  sent: { label: "Đã gửi Zalo", tone: "default" },
  failed: { label: "Gửi lỗi", tone: "destructive" },
};

async function requestSpinUpdate(url: string, init: RequestInit, fallbackMessage: string) {
  const response = await fetch(url, init);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? fallbackMessage);
  }

  return { message: String(result.message ?? ""), spin: parseSrxLuckyWheelSpin(result.spin) };
}

function ZbsCell({ isBusy, onResend, win }: { isBusy: boolean; onResend: () => void; win: SrxLuckyWheelSpin }) {
  // Chỉ lượt trúng voucher tự sinh mới có tin ZBS.
  if (!win.voucher_ends_on) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const status = zbsStatusLabels[win.zbs_status];
  const canResend = ["failed", "pending", "none"].includes(win.zbs_status);

  return (
    <div className="grid justify-items-start gap-1">
      <Badge variant={status.tone}>{status.label}</Badge>
      {win.zbs_status === "failed" && win.zbs_error ? (
        <span className="text-destructive max-w-[220px] text-xs leading-4">{win.zbs_error}</span>
      ) : null}
      {canResend ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isBusy} onClick={onResend}>
          <RotateCw className="size-3.5" />
          Gửi lại
        </Button>
      ) : null}
    </div>
  );
}

export function LuckyWheelWinsCard({ initialWins }: { initialWins: SrxLuckyWheelSpin[] }) {
  const [wins, setWins] = React.useState(initialWins);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function runUpdate(winId: string, action: () => Promise<{ message: string; spin: SrxLuckyWheelSpin }>) {
    try {
      setPendingId(winId);
      const { message, spin } = await action();
      setWins((current) => current.map((entry) => (entry.id === spin.id ? spin : entry)));
      return message;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật lượt quay");
      return null;
    } finally {
      setPendingId(null);
    }
  }

  function toggleFulfilled(win: SrxLuckyWheelSpin, fulfilled: boolean) {
    void runUpdate(win.id, () =>
      requestSpinUpdate(
        `/api/srx/lucky-wheel/spins/${win.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: fulfilled ? "fulfilled" : "won" }),
        },
        "Không thể cập nhật lượt quay",
      ),
    );
  }

  async function resendZbs(win: SrxLuckyWheelSpin) {
    const message = await runUpdate(win.id, () =>
      requestSpinUpdate(`/api/srx/lucky-wheel/spins/${win.id}/zbs`, { method: "POST" }, "Không thể gửi tin ZBS"),
    );

    if (message) {
      toast.info(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Khách trúng thưởng gần đây
        </CardTitle>
        <CardDescription>
          {wins.length} lượt trúng gần nhất. Đánh dấu “Đã trao” sau khi gửi quà hoặc khách đã dùng mã.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {wins.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Phần thưởng</TableHead>
                <TableHead>Gửi Zalo</TableHead>
                <TableHead className="text-right">Đã trao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wins.map((win) => (
                <TableRow key={win.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {win.created_at.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{win.customer_name || `#${win.user_id}`}</div>
                    <div className="text-muted-foreground text-xs">
                      {[win.customer_phone, win.customer_email].filter(Boolean).join(" · ") || "Chưa có liên hệ"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{win.prize_name}</div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="outline">{srxLuckyWheelPrizeTypeLabels[win.prize_type]}</Badge>
                      {win.reward_code ? <span className="font-mono">{win.reward_code}</span> : null}
                      {win.voucher_ends_on ? <span>HSD {win.voucher_ends_on}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ZbsCell win={win} isBusy={pendingId === win.id} onResend={() => void resendZbs(win)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Checkbox
                      aria-label="Đã trao phần thưởng"
                      checked={win.status === "fulfilled"}
                      disabled={pendingId === win.id}
                      onCheckedChange={(checked) => toggleFulfilled(win, checked === true)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm">Chưa có khách nào trúng thưởng.</p>
        )}
      </CardContent>
    </Card>
  );
}
