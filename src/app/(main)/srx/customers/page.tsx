import { getSrxCustomers } from "@/lib/srx-users";

import { DataTable } from "./_components/data-table";

export const dynamic = "force-dynamic";

export default async function Page() {
  const users = await getSrxCustomers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={Array.isArray(users) ? users : []} />
    </div>
  );
}
