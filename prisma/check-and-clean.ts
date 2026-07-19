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

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const cats: any[] = await prisma.$queryRaw`
    SELECT mc.id, mc.name, c.name as cafe_name
    FROM menu_categories mc
    LEFT JOIN cafes c ON c.id = mc.cafe_id
    WHERE mc.cafe_id IS NOT NULL
    ORDER BY c.name, mc.name
  `;
  const itemCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as n FROM menu_items WHERE cafe_id IS NOT NULL
  `;
  const orderCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as n FROM orders
  `;

  console.log(`\nCafe-specific categories to remove (${cats.length}):`);
  cats.forEach(r => console.log(`  [${r.cafe_name}] ${r.name}`));
  console.log(`Cafe-specific items to remove: ${itemCount[0].n}`);
  console.log(`Total orders in DB: ${orderCount[0].n}`);

  // Items used in real orders — must keep them (to preserve order history) but will unlink category
  const referenced: any[] = await prisma.$queryRaw`
    SELECT mi.id, mi.name, COUNT(oi.id)::int as order_count
    FROM menu_items mi
    JOIN order_items oi ON oi.menu_item_id = mi.id
    WHERE mi.cafe_id IS NOT NULL
    GROUP BY mi.id, mi.name
  `;

  if (referenced.length > 0) {
    console.log(`\nWARNING: ${referenced.length} test item(s) are used in real orders and will be kept:`);
    referenced.forEach(r => console.log(`  "${r.name}" — ${r.order_count} order(s)`));
    console.log("  Their category link will be cleared so we can delete the categories.");
  } else {
    console.log("\nNo test items are referenced by orders — safe to delete all.");
  }

  if (DRY_RUN) {
    console.log("\n-- DRY RUN: nothing deleted. Remove --dry-run to execute.");
    return;
  }

  // Step 1: Null out category_id on items we must keep (order-referenced)
  await prisma.$executeRaw`
    UPDATE menu_items
    SET category_id = NULL
    WHERE cafe_id IS NOT NULL
      AND id IN (SELECT menu_item_id FROM order_items)
  `;

  // Step 2: Delete cafe-specific items that are NOT referenced in any order
  const delItems: any[] = await prisma.$queryRaw`
    DELETE FROM menu_items
    WHERE cafe_id IS NOT NULL
      AND id NOT IN (SELECT menu_item_id FROM order_items)
    RETURNING name
  `;
  console.log(`\nDeleted ${delItems.length} unreferenced test items: ${delItems.map(i => i.name).join(", ") || "none"}`);

  // Step 3: Delete all cafe-specific categories (items no longer reference them)
  const delCats: any[] = await prisma.$queryRaw`
    DELETE FROM menu_categories
    WHERE cafe_id IS NOT NULL
    RETURNING name
  `;
  console.log(`Deleted ${delCats.length} test categories: ${delCats.map(c => c.name).join(", ")}`);

  console.log("\nDone. Global menu is untouched.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
