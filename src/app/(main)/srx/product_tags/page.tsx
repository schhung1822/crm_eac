import type { Metadata } from "next";

import { getSrxProductTags } from "@/lib/srx-products";

import { TagsManager } from "./_components/tags-manager";

export const metadata: Metadata = {
  title: "Từ điển thành phần",
};

export default async function Page() {
  const tags = await getSrxProductTags();

  return <TagsManager initialTags={tags} />;
}
