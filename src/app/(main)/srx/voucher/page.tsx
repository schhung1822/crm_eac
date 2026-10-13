import { getLuckyWheelCodeSources, withStackFlags } from "@/lib/srx-discount-code-extras";
import { getSrxProductCategories, getSrxProducts } from "@/lib/srx-products";
import { getSrxDiscountCodes } from "@/lib/srx-website";

import { DiscountCodesManager } from "./_components/discount-codes-manager";

export default async function Page() {
  const [discountCodes, products, categories, codeSources] = await Promise.all([
    getSrxDiscountCodes().then(withStackFlags),
    getSrxProducts(),
    getSrxProductCategories(),
    getLuckyWheelCodeSources(),
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    label: product.name,
  }));

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    label: category.parent_name ? `${category.parent_name} / ${category.name}` : category.name,
  }));

  return (
    <DiscountCodesManager
      initialDiscountCodes={discountCodes}
      productOptions={productOptions}
      categoryOptions={categoryOptions}
      codeSources={codeSources}
    />
  );
}
