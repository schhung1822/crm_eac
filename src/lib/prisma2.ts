import { ensureSrxDatabaseEnv } from "@/lib/srx-env";

import { PrismaClient } from "../../prisma/generated/srx-app-client";

const globalForPrisma2 = globalThis as unknown as {
  prisma2: PrismaClient | undefined;
  prisma2Url: string | undefined;
};

function createPrisma2Client(): PrismaClient {
  const srxDatabaseUrl = ensureSrxDatabaseEnv();

  if (!globalForPrisma2.prisma2 || globalForPrisma2.prisma2Url !== srxDatabaseUrl) {
    void globalForPrisma2.prisma2?.$disconnect().catch(() => undefined);

    globalForPrisma2.prisma2 = new PrismaClient({
      datasources: {
        db: {
          url: srxDatabaseUrl,
        },
      },
    });
    globalForPrisma2.prisma2Url = srxDatabaseUrl;
  }

  return globalForPrisma2.prisma2;
}

export function getPrisma2Client(): PrismaClient {
  return createPrisma2Client();
}

export const prisma2 = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma2Client();
    const value = Reflect.get(client as object, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
