import { getSrxNewsTags } from "@/lib/srx-news";

import { TagsManager } from "../news/_components/tags-manager";

export default async function Page() {
  const tags = await getSrxNewsTags();

  return <TagsManager initialTags={tags} />;
}
