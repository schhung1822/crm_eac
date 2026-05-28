import { notFound } from "next/navigation";

import { getSrxProductTagById, getSrxProductTagOptionCatalog } from "@/lib/srx-products";

import { ProductTagEditorForm } from "../../_components/product-tag-editor-form";

export default async function Page({ params }: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await params;

  if (!/^\d+$/.test(tagId)) {
    notFound();
  }

  const [tag, optionCatalog] = await Promise.all([getSrxProductTagById(tagId), getSrxProductTagOptionCatalog()]);

  if (!tag) {
    notFound();
  }

  return <ProductTagEditorForm initialValue={tag} optionCatalog={optionCatalog} />;
}
