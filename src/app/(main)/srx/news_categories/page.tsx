import { getSrxNewsCategories } from "@/lib/srx-news";

import { CategoriesManager } from "../news/_components/categories-manager";

export default async function Page() {
  const categories = await getSrxNewsCategories();

  return <CategoriesManager initialCategories={categories} />;
}
