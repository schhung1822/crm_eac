import { getSrxProductCategories } from "@/lib/srx-products";

import { CategoriesManager } from "../products/_components/categories-manager";

export default async function Page() {
  const categories = await getSrxProductCategories();

  return <CategoriesManager initialCategories={categories} />;
}
