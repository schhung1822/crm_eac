import { notFound } from "next/navigation";

import { getProductKiotVietLinks } from "@/lib/srx-kiotviet-links";
import { getSrxProductBrands, getSrxProductById, getSrxProductCategories, getSrxProductTags } from "@/lib/srx-products";

import { ProductEditorForm } from "../../_components/product-editor-form";

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  if (!/^\d+$/.test(productId)) {
    notFound();
  }

  const [product, brands, categories, tags, kiotVietLinks] = await Promise.all([
    getSrxProductById(productId),
    getSrxProductBrands(),
    getSrxProductCategories(),
    getSrxProductTags(),
    getProductKiotVietLinks(productId),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductEditorForm
      initialValue={product}
      initialKiotVietLinks={kiotVietLinks}
      brands={brands}
      categories={categories}
      tags={tags}
    />
  );
}
