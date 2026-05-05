import { getSrxNewsCategories, getSrxNewsPosts } from "@/lib/srx-news";

import { PostsManager } from "./_components/posts-manager";

export default async function Page() {
  const [posts, categories] = await Promise.all([getSrxNewsPosts(), getSrxNewsCategories()]);

  return <PostsManager initialPosts={posts} canCreatePost={categories.length > 0} />;
}
