import { PrismaClient } from "@prisma/client";

import { ensurePrimaryDatabaseEnv } from "@/lib/database-env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function createPrismaClient(): PrismaClient {
  const primaryDatabaseUrl = ensurePrimaryDatabaseEnv();

  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== primaryDatabaseUrl) {
    void globalForPrisma.prisma?.$disconnect().catch(() => undefined);

    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: primaryDatabaseUrl,
        },
      },
      log: ["query"],
    });
    globalForPrisma.prismaUrl = primaryDatabaseUrl;
  }

  return globalForPrisma.prisma;
}

export function getPrismaClient(): PrismaClient {
  return createPrismaClient();
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
