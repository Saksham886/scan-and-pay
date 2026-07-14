import { prisma } from "@/backend/lib/db";

export async function generateOrderNumber(cafeId: string, cafeSlug: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = cafeSlug.slice(0, 4).toUpperCase();

  // Upsert compiles to a single INSERT ... ON CONFLICT DO UPDATE on
  // Postgres, so concurrent orders for the same cafe/day each get a
  // distinct incremented count instead of racing on a count-then-write read.
  const counter = await prisma.orderCounter.upsert({
    where: { cafeId_dateKey: { cafeId, dateKey: dateStr } },
    create: { cafeId, dateKey: dateStr, count: 1 },
    update: { count: { increment: 1 } },
  });

  const seq = String(counter.count).padStart(4, "0");
  return `${prefix}-${dateStr}-${seq}`;
}
