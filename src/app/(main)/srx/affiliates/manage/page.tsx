import { getSrxAffiliateAccounts, getSrxAffiliateUserOptions } from "@/lib/srx-affiliates";

import { AffiliateAccountsManager } from "../_components/affiliate-accounts-manager";

export default async function Page() {
  const [accounts, userOptions] = await Promise.all([getSrxAffiliateAccounts(), getSrxAffiliateUserOptions()]);

  return <AffiliateAccountsManager initialAccounts={accounts} initialUserOptions={userOptions} />;
}
