import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  redirect(slug === "edit" ? "/srx/ladipage-events" : `/srx/ladipage-events?slug=${encodeURIComponent(slug)}`);
}
