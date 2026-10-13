import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSrxLuckyWheelPrizes,
  getSrxLuckyWheelRecentWins,
  getSrxLuckyWheelSettings,
  getSrxLuckyWheelStats,
} from "@/lib/srx-lucky-wheel";

import { LuckyWheelPrizesCard } from "./_components/lucky-wheel-prizes-card";
import { LuckyWheelSettingsCard } from "./_components/lucky-wheel-settings-card";
import { LuckyWheelWinsCard } from "./_components/lucky-wheel-wins-card";

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value.toLocaleString("vi-VN")}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground px-4 text-xs">{hint}</CardContent>
    </Card>
  );
}

export default async function Page() {
  const [settings, prizes, wins, stats] = await Promise.all([
    getSrxLuckyWheelSettings(),
    getSrxLuckyWheelPrizes(),
    getSrxLuckyWheelRecentWins(),
    getSrxLuckyWheelStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vòng quay may mắn</h1>
        <p className="text-muted-foreground">
          Mỗi tài khoản đăng nhập được 1 lượt quay; mời bạn bè tạo tài khoản để nhận thêm lượt. Kết quả do máy chủ bốc
          theo tỷ lệ bên dưới, khách không xem được tỷ lệ.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lượt đã quay" value={stats.total_spins} hint={`${stats.winning_spins} lượt trúng thưởng`} />
        <StatCard label="Chờ trao thưởng" value={stats.pending_fulfillment} hint="Lượt trúng chưa đánh dấu đã trao" />
        <StatCard
          label="Khách đã nhận lượt"
          value={stats.signed_in_players}
          hint="Tài khoản đã mở vòng quay khi đăng nhập"
        />
        <StatCard
          label="Bạn bè được mời"
          value={stats.referrals_signed_up}
          hint={`${stats.referrals_credited} người đã đủ điều kiện cộng lượt`}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <LuckyWheelSettingsCard initialSettings={settings} />
        <LuckyWheelPrizesCard initialPrizes={prizes} />
      </div>

      <LuckyWheelWinsCard initialWins={wins} />
    </div>
  );
}
