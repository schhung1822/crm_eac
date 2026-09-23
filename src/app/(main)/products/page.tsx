import { getProducts } from "@/lib/products";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  const products = await getProducts();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <section className="md:py-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Hàng hóa</h1>
      </section>
      <DataTable data={products} />
    </div>
  );
}
