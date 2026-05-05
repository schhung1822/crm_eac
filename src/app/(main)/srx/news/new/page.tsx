import { getSrxNewsCategories, getSrxNewsTags } from "@/lib/srx-news";

import { PostEditorForm } from "../_components/post-editor-form";

export default async function Page() {
  const [categories, tags] = await Promise.all([getSrxNewsCategories(), getSrxNewsTags()]);

  return <PostEditorForm initialValue={null} categories={categories} tags={tags} />;
}
