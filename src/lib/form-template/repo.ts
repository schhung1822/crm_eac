import { prisma } from "@/lib/prisma"; // bạn đã có prisma client

import { defaultConfig } from "./default-config";
import { FormTemplateConfig } from "./types";

export async function getTemplateBySlug(slug: string) {
  const row = await prisma.formTemplate.findUnique({ where: { slug } });
  if (!row || !row.configJson) return null;
  return {
    id: row.id_temp ?? "",
    slug: row.slug ?? "",
    name: row.name ?? "",
    isActive: row.isActive === "1" || row.isActive === "true",
    config: JSON.parse(row.configJson) as FormTemplateConfig,
  };
}

export async function getActiveTemplate() {
  const row = await prisma.formTemplate.findFirst({
    where: { isActive: { in: ["1", "true"] } },
    orderBy: { update_time: "desc" },
  });
  if (!row || !row.configJson) return null;
  return {
    id: row.id_temp ?? "",
    slug: row.slug ?? "",
    name: row.name ?? "",
    isActive: row.isActive === "1" || row.isActive === "true",
    config: JSON.parse(row.configJson) as FormTemplateConfig,
  };
}

export async function upsertTemplate(slug: string, name: string, config: FormTemplateConfig) {
  const configJson = JSON.stringify(config);
  return prisma.formTemplate.upsert({
    where: { slug },
    update: { name, configJson, isActive: "1" },
    create: { slug, name, configJson, isActive: "1" },
  });
}

export async function updateTemplateBySlug(
  currentSlug: string,
  nextSlug: string,
  name: string,
  config: FormTemplateConfig,
) {
  const configJson = JSON.stringify(config);
  const normalizedNextSlug = nextSlug.trim();

  if (!normalizedNextSlug) {
    throw new Error("Slug không được để trống");
  }

  const existingCurrent = await prisma.formTemplate.findUnique({ where: { slug: currentSlug } });
  if (!existingCurrent) {
    return upsertTemplate(normalizedNextSlug, name, config);
  }

  if (normalizedNextSlug !== currentSlug) {
    const exists = await prisma.formTemplate.findUnique({ where: { slug: normalizedNextSlug } });
    if (exists) {
      throw new Error("Slug đã tồn tại");
    }
  }

  return prisma.formTemplate.update({
    where: { slug: currentSlug },
    data: {
      slug: normalizedNextSlug,
      name,
      configJson,
      isActive: "1",
    },
  });
}

export async function ensureDefaultTemplate() {
  const slug = "eac-checkin";
  const exists = await prisma.formTemplate.findUnique({ where: { slug } });
  if (exists) return;
  await prisma.formTemplate.create({
    data: { slug, name: "EAC Check-in", configJson: JSON.stringify(defaultConfig), isActive: "1" },
  });
}
