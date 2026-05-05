import { getSrxProducts } from "@/lib/srx-products";

import { ProductsManager } from "./_components/products-manager";

export default async function Page() {
  const products = await getSrxProducts();

  return <ProductsManager initialProducts={products} />;
}
