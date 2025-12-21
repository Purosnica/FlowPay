import { PrismaClient } from "@prisma/client";

interface GlobalPrisma {
  prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as GlobalPrisma;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
