import { Skeleton } from "@/components/ui/skeleton";

// Khung chờ dùng chung cho các trang dữ liệu, hiện ngay khi chuyển trang trong lúc server truy vấn.
export default function PageLoading() {
  return (
    <div className="flex flex-col gap-4 p-1" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
