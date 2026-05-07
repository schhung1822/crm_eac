import TemplateRenderer from "@/components/form-template/TemplateRenderer";
import { getPublishedSrxLadipageEventBySlug } from "@/lib/srx-ladipage-events";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ladipageEvent = await getPublishedSrxLadipageEventBySlug(slug);

  if (!ladipageEvent) {
    return <div className="p-6">Template không tồn tại hoặc đã tắt.</div>;
  }

  return <TemplateRenderer config={ladipageEvent.config} />;
}
