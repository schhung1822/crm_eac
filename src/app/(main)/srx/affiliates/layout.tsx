import type { ReactNode } from "react";

import CustomersLayout from "../customers/layout";

import { AffiliateSectionNav } from "./_components/affiliate-section-nav";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <CustomersLayout>
      <div className="flex flex-col gap-6">
        <AffiliateSectionNav />
        {children}
      </div>
    </CustomersLayout>
  );
}
