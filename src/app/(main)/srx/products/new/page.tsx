import { getSrxProductBrands, getSrxProductCategories, getSrxProductTags } from "@/lib/srx-products";

import { ProductEditorForm } from "../_components/product-editor-form";

export default async function Page() {
  const [brands, categories, tags] = await Promise.all([
    getSrxProductBrands(),
    getSrxProductCategories(),
    getSrxProductTags(),
  ]);

  return (
    <ProductEditorForm
      initialValue={null}
      initialKiotVietLinks={[]}
      brands={brands}
      categories={categories}
      tags={tags}
    />
  );
}
