"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="text-2xl font-semibold">Trang không tồn tại.</h1>
      <p className="text-muted-foreground">Trang bạn đang tìm có thể đang bị ẩn hoặc đã bị xóa.</p>
      <Button variant="outline" asChild>
        <Link replace href="/dashboard/default">
          Quay lại trang chủ
        </Link>
      </Button>
    </div>
  );
}
