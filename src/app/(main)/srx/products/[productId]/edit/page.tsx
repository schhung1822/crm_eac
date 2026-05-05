import { notFound } from "next/navigation";

import { getSrxProductBrands, getSrxProductById, getSrxProductCategories, getSrxProductTags } from "@/lib/srx-products";

import { ProductEditorForm } from "../../_components/product-editor-form";

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  if (!/^\d+$/.test(productId)) {
    notFound();
  }

  const [product, brands, categories, tags] = await Promise.all([
    getSrxProductById(productId),
    getSrxProductBrands(),
    getSrxProductCategories(),
    getSrxProductTags(),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductEditorForm initialValue={product} brands={brands} categories={categories} tags={tags} />;
}
