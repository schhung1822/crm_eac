import { getSrxAffiliateAccounts } from "@/lib/srx-affiliates";

import { AffiliateManagementManager } from "../_components/affiliate-management-manager";

export default async function Page() {
  const accounts = await getSrxAffiliateAccounts();

  return <AffiliateManagementManager initialAccounts={accounts} />;
}
