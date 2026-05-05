import { getSrxBanners } from "@/lib/srx-website";

import { BannersManager } from "./_components/banners-manager";

export default async function Page() {
  const banners = await getSrxBanners();

  return <BannersManager initialBanners={banners} />;
}
