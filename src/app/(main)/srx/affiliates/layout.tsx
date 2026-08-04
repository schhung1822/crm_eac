import type { ReactNode } from "react";

import CustomersLayout from "../customers/layout";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <CustomersLayout>
      <div className="flex flex-col gap-6">{children}</div>
    </CustomersLayout>
  );
}
