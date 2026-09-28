"use client";

import { Badge } from "@/components/ui/badge";
import type { SrxLadipageZbsLog } from "@/lib/srx-ladipage-zbs.shared";

const statusLabels: Record<SrxLadipageZbsLog["status"], string> = {
  pending: "Đang gửi",
  sent: "Đã gửi",
  failed: "Lỗi",
};

function formatPhone(phone: string): string {
  return /^84\d{9}$/.test(phone) ? `0${phone.slice(2)}` : phone;
}

export function LadipageZbsLogs({ logs }: { logs: SrxLadipageZbsLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Chưa gửi tin ZBS nào cho sự kiện này.
      </div>
    );
  }

  return (
    <div className="nice-scroll overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/60 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">Thời gian</th>
            <th className="px-3 py-2 font-medium">Khách hàng</th>
            <th className="px-3 py-2 font-medium">Mã đăng ký</th>
            <th className="px-3 py-2 font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="px-3 py-2 whitespace-nowrap">{log.created_at.toLocaleString("vi-VN")}</td>
              <td className="px-3 py-2">
                <div className="font-medium">{log.customer_name || "—"}</div>
                <div className="text-muted-foreground text-xs">{formatPhone(log.phone)}</div>
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {log.code}
                {log.is_test ? (
                  <Badge variant="outline" className="ml-2 font-sans">
                    Gửi thử
                  </Badge>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                >
                  {statusLabels[log.status]}
                </Badge>
                {log.error_message ? (
                  <div className="text-destructive mt-1 max-w-[280px] text-xs break-words">{log.error_message}</div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
