import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;

  if (url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url });
  }

  // Strip channel_binding=require — unsupported by pg driver
  const cleanUrl = url.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");

  // Pass config directly to PrismaPg to avoid type conflicts with pg's Pool
  const adapter = new PrismaPg({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
