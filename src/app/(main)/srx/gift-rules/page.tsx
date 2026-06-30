import { getSrxProducts } from "@/lib/srx-products";
import { getSrxGiftRules } from "@/lib/srx-website";

import { GiftRulesManager } from "./_components/gift-rules-manager";

export default async function Page() {
  const [giftRules, products] = await Promise.all([getSrxGiftRules(), getSrxProducts()]);
  const productOptions = products.map((product) => ({
    id: product.id,
    label: product.name,
    sku: product.product_code,
    thumbnailUrl: product.thumbnail_url,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.variant_name || variant.sku,
      sku: variant.sku,
    })),
  }));

  return <GiftRulesManager initialGiftRules={giftRules} productOptions={productOptions} />;
}
