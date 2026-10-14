"use client";

import * as React from "react";

import Link from "next/link";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

type PageErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Trang lỗi dùng chung cho từng khu vực: giữ nguyên thanh bên, cho thử lại và hiện mã lỗi để tra log trên server.
export default function PageError({ error, reset }: PageErrorProps) {
  React.useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">Không tải được trang này</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Có lỗi khi lấy dữ liệu, thường do kết nối cơ sở dữ liệu bị gián đoạn. Dữ liệu của bạn không bị mất. Hãy thử lại
        sau vài giây.
      </p>
      {error.digest ? <p className="text-muted-foreground text-xs">Mã lỗi: {error.digest}</p> : null}
      <div className="flex gap-2 pt-1">
        <Button onClick={() => reset()}>Thử lại</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/default">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
