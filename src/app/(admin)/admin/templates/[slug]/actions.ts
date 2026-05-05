"use server";

import type { FormTemplateConfig } from "@/lib/form-template/types";
import { saveSrxLadipageEvent } from "@/lib/srx-ladipage-events";

export async function saveTemplateAction(
  slug: string,
  nextSlug: string,
  name: string,
  config: FormTemplateConfig
) {
  // TODO: nếu CRM bạn có auth, check role admin ở đây
  await saveSrxLadipageEvent(slug, nextSlug, name, config);
  return { ok: true };
}
