// @ts-nocheck
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
function createClient() {
  if (url.startsWith("prisma+postgres://")) return new PrismaClient({ accelerateUrl: url });
  return new PrismaClient({ adapter: new PrismaPg(url) });
}
const prisma = createClient();

async function main() {
  // Delete in FK-safe order
  const oi: any[] = await prisma.$queryRaw`DELETE FROM order_items RETURNING id`;
  console.log(`Deleted ${oi.length} order items`);

  const pay: any[] = await prisma.$queryRaw`DELETE FROM payments RETURNING id`;
  console.log(`Deleted ${pay.length} payments`);

  const ord: any[] = await prisma.$queryRaw`DELETE FROM orders RETURNING id`;
  console.log(`Deleted ${ord.length} orders`);

  const items: any[] = await prisma.$queryRaw`DELETE FROM menu_items WHERE cafe_id IS NOT NULL RETURNING name`;
  console.log(`Deleted ${items.length} test menu items: ${items.map(i => i.name).join(", ")}`);

  const cats: any[] = await prisma.$queryRaw`DELETE FROM menu_categories WHERE cafe_id IS NOT NULL RETURNING name`;
  console.log(`Deleted ${cats.length} test categories`);

  console.log("\nAll test data removed. Global menu is untouched.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
