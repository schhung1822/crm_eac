import { getSrxAffiliateApplications } from "@/lib/srx-affiliates";

import { AffiliateApplicationManager } from "../_components/affiliate-application-manager";

export default async function Page() {
  const applications = await getSrxAffiliateApplications();

  return <AffiliateApplicationManager initialApplications={applications} />;
}
