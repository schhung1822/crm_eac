import { Newspaper } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSrxBanners } from "@/lib/srx-website";
import { getSrxWebsitePopupSettings } from "@/lib/srx-website-popup";

import { PopupDisplaySettingsCard } from "./_components/popup-display-settings-card";
import { PopupItemsCard } from "./_components/popup-items-card";

export default async function Page() {
  const [banners, settings] = await Promise.all([getSrxBanners(), getSrxWebsitePopupSettings()]);
  const popupItems = banners.filter((banner) => banner.position === "popup");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Popup quảng cáo</h1>
        <p className="text-muted-foreground">
          Trang chủ và trang chi tiết tin tức dùng chung một popup, chỉ khác cách popup xuất hiện.
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid gap-6">
          <PopupDisplaySettingsCard initialSettings={settings} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="size-4" />
                Popup ở trang chi tiết tin tức
              </CardTitle>
              <CardDescription className="leading-6">
                Giữ nguyên như hiện tại: ảnh xếp chồng ở cột phải (trên điện thoại nằm cuối bài viết), khách bấm vào thì
                mở popup. Luôn hiển thị, không cần bật tắt.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <PopupItemsCard initialItems={popupItems} />
      </div>
    </div>
  );
}
