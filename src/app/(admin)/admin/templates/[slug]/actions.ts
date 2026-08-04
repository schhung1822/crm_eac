"use server";

import { ensureSrxServerActionAccess } from "@/lib/admin-api";
import type { FormTemplateConfig } from "@/lib/form-template/types";
import { saveSrxLadipageEvent } from "@/lib/srx-ladipage-events";

export async function saveTemplateAction(
  slug: string,
  nextSlug: string,
  name: string,
  config: FormTemplateConfig,
  options: { publish?: boolean } = {},
) {
  await ensureSrxServerActionAccess("ladipage", "Ban khong co quyen quan ly Ladipage su kien website");
  const event = await saveSrxLadipageEvent(slug, nextSlug, name, config, options);
  return { ok: true, eventId: event.id, eventSlug: event.slug, status: event.status };
}
