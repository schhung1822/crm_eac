// app/(main)/orders/page.tsx
export const runtime = "nodejs";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getChannels } from "@/lib/orders";

import { DataTable } from "./_components/data-table";
import { ORDER_RANGE_OPTIONS, ORDER_ROW_LIMIT, resolveOrderRange } from "./_components/range-options";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const range = resolveOrderRange(params.range);
  const days = ORDER_RANGE_OPTIONS.find((option) => option.key === range)?.days ?? null;

  let from: Date | undefined;
  if (days !== null) {
    from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  let channels: Awaited<ReturnType<typeof getChannels>> = [];
  let loadFailed = false;
  try {
    channels = await getChannels({ from, limit: ORDER_ROW_LIMIT });
  } catch (e) {
    console.error("getChannels error:", e);
    loadFailed = true;
  }

  // key theo khoảng thời gian để bảng nạp lại dữ liệu mới khi đổi bộ lọc.
  return (
    <div className="flex flex-col gap-4">
      {loadFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Không tải được danh sách đơn hàng</AlertTitle>
          <AlertDescription>
            Danh sách trống bên dưới chưa phản ánh dữ liệu thật. Hãy tải lại trang sau vài giây.
          </AlertDescription>
        </Alert>
      ) : null}
      <DataTable key={range} data={channels} range={range} rowLimit={ORDER_ROW_LIMIT} />
    </div>
  );
}
