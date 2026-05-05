import { getSrxAffiliateAccounts } from "@/lib/srx-affiliates";

import { AffiliateCommissionManager } from "../_components/affiliate-commission-manager";

export default async function Page() {
  const accounts = await getSrxAffiliateAccounts();

  return <AffiliateCommissionManager initialAccounts={accounts} />;
}
