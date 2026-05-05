import { notFound } from "next/navigation";

import { getSrxNewsCategories, getSrxNewsPostById, getSrxNewsTags } from "@/lib/srx-news";

import { PostEditorForm } from "../../_components/post-editor-form";

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  if (!/^\d+$/.test(postId)) {
    notFound();
  }

  const [post, categories, tags] = await Promise.all([
    getSrxNewsPostById(postId),
    getSrxNewsCategories(),
    getSrxNewsTags(),
  ]);

  if (!post) {
    notFound();
  }

  return <PostEditorForm initialValue={post} categories={categories} tags={tags} />;
}
