import { getSrxProductTagOptionCatalog } from "@/lib/srx-products";

import { ProductTagEditorForm } from "../_components/product-tag-editor-form";

export default async function Page() {
  const optionCatalog = await getSrxProductTagOptionCatalog();

  return <ProductTagEditorForm initialValue={null} optionCatalog={optionCatalog} />;
}
