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
  // Show current state
  const current: any[] = await prisma.$queryRaw`
    SELECT mi.id, mi.name, mi.price_paise, mi.is_veg, mi.sort_order, mi.cafe_id,
           mc.name as category_name, mc.id as category_id
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.name ILIKE 'french fries'
  `;
  console.log("Current French Fries entries:", JSON.stringify(current, null, 2));

  // Get the global Snacks category id
  const snacksCat: any[] = await prisma.$queryRaw`
    SELECT id FROM menu_categories WHERE name = 'Snacks' AND cafe_id IS NULL
  `;
  if (!snacksCat.length) { console.error("Snacks category not found!"); return; }
  const snacksCatId = snacksCat[0].id;

  // Delete all existing French Fries entries (global) and re-insert correctly
  await prisma.$executeRaw`DELETE FROM menu_items WHERE name ILIKE 'french fries' AND cafe_id IS NULL`;
  console.log("Deleted old French Fries global entry.");

  await prisma.$executeRaw`
    INSERT INTO menu_items (id, cafe_id, category_id, name, description, price_paise, is_available, is_veg, sort_order, created_at, updated_at)
    VALUES (gen_random_uuid(), NULL, ${snacksCatId}::uuid, 'French Fries', NULL, 4500, true, true, 9, now(), now())
  `;
  console.log("Inserted correct French Fries — ₹45, Snacks category, global.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
