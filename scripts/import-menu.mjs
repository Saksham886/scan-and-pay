// Replaces ALL current menu data with the new global menu from menu-data.json.
//  - Items referenced by existing orders (FK) are kept but hidden (unavailable, unlinked)
//  - All other items + every category are deleted
//  - The new menu is created as GLOBAL (cafeId=null) so it appears in every cafe
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const env = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
// Use the direct (non-pooler) endpoint — better suited to a long interactive transaction.
const url = (env.DIRECT_DATABASE_URL || env.DATABASE_URL).replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } }) });

const data = JSON.parse(readFileSync(new URL("./menu-data.json", import.meta.url), "utf8"));

await prisma.$transaction(async (tx) => {
  const referenced = (
    await tx.orderItem.findMany({ distinct: ["menuItemId"], select: { menuItemId: true } })
  ).map((r) => r.menuItemId);

  // Keep order-referenced items for history, but remove them from every menu.
  await tx.menuItem.updateMany({
    where: { id: { in: referenced } },
    data: { isAvailable: false, categoryId: null },
  });

  // Delete all other items, then every category (now unreferenced).
  const delItems = await tx.menuItem.deleteMany({ where: { id: { notIn: referenced } } });
  const delCats = await tx.menuCategory.deleteMany({});
  console.log(`hidden: ${referenced.length} | deleted items: ${delItems.count} | deleted categories: ${delCats.count}`);

  // Create the new menu as global (cafeId = null).
  let catSort = 0;
  let itemTotal = 0;
  for (const c of data) {
    const cat = await tx.menuCategory.create({
      data: { name: c.name, cafeId: null, sortOrder: catSort++, isActive: true },
    });
    await tx.menuItem.createMany({
      data: c.items.map((i, idx) => ({
        name: i.name,
        description: i.description,
        pricePaise: i.pricePaise,
        isVeg: i.isVeg,
        isAvailable: true,
        cafeId: null,
        categoryId: cat.id,
        sortOrder: idx,
      })),
    });
    itemTotal += c.items.length;
  }
  console.log(`created: ${data.length} global categories | ${itemTotal} global items`);
}, { timeout: 120000 });

await prisma.$disconnect();
console.log("done");
