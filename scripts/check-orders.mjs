// Read-only: list the most recent orders + their payment state to see whether
// orders are actually reaching PAID (required for WhatsApp + the ding poll).
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const l of raw.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const cleanUrl = process.env.DATABASE_URL.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");
const adapter = new PrismaPg({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const orders = await prisma.order.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  include: { payments: true, cafe: { select: { name: true } } },
});

for (const o of orders) {
  const pay = o.payments?.[o.payments.length - 1];
  console.log(
    [
      o.createdAt.toISOString(),
      `#${o.orderNumber}`,
      `order=${o.status}`,
      `pay=${pay?.status ?? "none"}`,
      `phone=${o.customerPhone ?? "—"}`,
      `cafe=${o.cafe?.name ?? o.cafeId}`,
    ].join("  ")
  );
}

await prisma.$disconnect();
