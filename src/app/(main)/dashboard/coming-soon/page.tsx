export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang.</h1>
      <p className="text-muted-foreground">Trang này đang được phát triển và sẽ có trong các bản cập nhật tương lai.</p>
    </div>
  );
}
