// @ts-nocheck
// One-off backfill: gives every existing cafe its 4 menus (Breakfast/Lunch/
// Evening Snacks/Dinner) and reparents that cafe's existing flat
// categories/items onto the Lunch menu, so pre-pivot cafes keep behaving
// identically. Run once between applying the additive migration and
// deploying the app. Safe to re-run: skips cafes that already have menus.
import "dotenv/config";
import { PrismaClient, MenuType } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL!;
const cleanUrl = url.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");
const adapter = new PrismaPg({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const cafes = await prisma.cafe.findMany({ select: { id: true, name: true } });
  console.log(`Found ${cafes.length} cafe(s).\n`);

  let migrated = 0;
  let skipped = 0;

  for (const cafe of cafes) {
    const existing = await prisma.menu.findFirst({ where: { cafeId: cafe.id } });
    if (existing) {
      console.log(`- ${cafe.name}: already has menus, skipping`);
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const [, lunch] = await Promise.all([
        tx.menu.create({
          data: { cafeId: cafe.id, type: MenuType.BREAKFAST, isActive: false, isSubsidised: false },
        }),
        tx.menu.create({
          data: { cafeId: cafe.id, type: MenuType.LUNCH, isActive: true, isSubsidised: false },
        }),
        tx.menu.create({
          data: { cafeId: cafe.id, type: MenuType.EVENING_SNACKS, isActive: false, isSubsidised: true },
        }),
        tx.menu.create({
          data: { cafeId: cafe.id, type: MenuType.DINNER, isActive: false, isSubsidised: true },
        }),
      ]);

      const [categoryResult, itemResult] = await Promise.all([
        tx.menuCategory.updateMany({
          where: { cafeId: cafe.id, menuId: null },
          data: { menuId: lunch.id },
        }),
        tx.menuItem.updateMany({
          where: { cafeId: cafe.id, menuId: null },
          data: { menuId: lunch.id },
        }),
      ]);

      console.log(
        `- ${cafe.name}: created 4 menus, reparented ${categoryResult.count} categories / ${itemResult.count} items onto Lunch`
      );
    });

    migrated++;
  }

  console.log(`\nDone. Migrated ${migrated} cafe(s), skipped ${skipped} already-migrated cafe(s).`);

  // Verification: 4 menus per migrated cafe, no orphaned cafe-scoped items left behind.
  const orphanedCategories = await prisma.menuCategory.count({
    where: { cafeId: { not: null }, menuId: null },
  });
  const orphanedItems = await prisma.menuItem.count({
    where: { cafeId: { not: null }, menuId: null },
  });
  if (orphanedCategories > 0 || orphanedItems > 0) {
    console.warn(
      `\nWARNING: ${orphanedCategories} orphaned cafe-scoped categories and ${orphanedItems} orphaned cafe-scoped items remain (cafeId set, menuId null).`
    );
  } else {
    console.log("Verification passed: no orphaned cafe-scoped categories/items.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
