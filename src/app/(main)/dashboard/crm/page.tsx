import { redirect } from "next/navigation";

import { CRM_SEGMENTS } from "@/lib/crm-segments";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = new URLSearchParams(await searchParams).toString();

  redirect(query ? `${CRM_SEGMENTS.b2b.path}?${query}` : CRM_SEGMENTS.b2b.path);
}
