// @ts-nocheck
/**
 * Seeds global menu categories and items (cafeId = null).
 * These are visible to ALL cafes automatically.
 * Safe to re-run — skips categories/items that already exist by name.
 *
 * Run: npx tsx prisma/seed-global-menu.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

function createClient() {
  if (url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url });
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

const prisma = createClient();

// Loaded once at startup; used for duplicate checks
let existingCategories: { id: string; name: string }[] = [];
let existingItems: { id: string; name: string }[] = [];

async function loadExisting() {
  // Use raw SQL to avoid Prisma null-filter quirks
  existingCategories = await prisma.$queryRaw`
    SELECT id, name FROM menu_categories WHERE cafe_id IS NULL
  `;
  existingItems = await prisma.$queryRaw`
    SELECT id, name FROM menu_items WHERE cafe_id IS NULL
  `;
}

async function getOrCreateCategory(name: string, sortOrder: number): Promise<{ id: string }> {
  const found = existingCategories.find((c) => c.name === name);
  if (found) {
    console.log(`  [skip] Category already exists: ${name}`);
    return found;
  }
  const cat = await prisma.$queryRaw`
    INSERT INTO menu_categories (id, cafe_id, name, sort_order, is_active, created_at)
    VALUES (gen_random_uuid(), NULL, ${name}, ${sortOrder}, true, now())
    RETURNING id, name
  `;
  const created = Array.isArray(cat) ? cat[0] : cat;
  existingCategories.push(created);
  console.log(`  [create] Category: ${name}`);
  return created;
}

async function createItemIfNotExists(data: {
  categoryId: string;
  name: string;
  description?: string;
  pricePaise: number;
  isVeg: boolean;
  sortOrder: number;
}) {
  if (existingItems.find((i) => i.name === data.name)) {
    console.log(`    [skip] Item already exists: ${data.name}`);
    return;
  }
  await prisma.$queryRaw`
    INSERT INTO menu_items (
      id, cafe_id, category_id, name, description,
      price_paise, is_available, is_veg, sort_order, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), NULL, ${data.categoryId}::uuid, ${data.name}, ${data.description ?? null},
      ${data.pricePaise}, true, ${data.isVeg}, ${data.sortOrder}, now(), now()
    )
  `;
  existingItems.push({ id: "pending", name: data.name });
  console.log(`    [create] Item: ${data.name} (₹${data.pricePaise / 100})`);
}

async function main() {
  console.log("Seeding global menu (visible to all cafes)...\n");
  await loadExisting();

  // ─── FRESH JUICES ────────────────────────────────────────
  const juices = await getOrCreateCategory("Fresh Juices", 10);
  const juiceDesc = "Fresh fruit juice with or without sugar (250 ml)";
  await createItemIfNotExists({ categoryId: juices.id, name: "Water Melon Juice", description: juiceDesc, pricePaise: 4000, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: juices.id, name: "Papaya Juice", description: juiceDesc, pricePaise: 4500, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: juices.id, name: "Mix Fruit Juice", description: juiceDesc, pricePaise: 4500, isVeg: true, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: juices.id, name: "Mint Lime Juice", description: juiceDesc, pricePaise: 4500, isVeg: true, sortOrder: 4 });

  // ─── PARATHAS ────────────────────────────────────────────
  const parathas = await getOrCreateCategory("Parathas", 20);
  const parathaDesc = "Live baked & served with curd & pickle (1 piece, 400 g)";
  await createItemIfNotExists({ categoryId: parathas.id, name: "Aloo Paratha", description: parathaDesc, pricePaise: 5000, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: parathas.id, name: "Mix Veg Paratha", description: parathaDesc, pricePaise: 5000, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: parathas.id, name: "Paneer Paratha", description: parathaDesc, pricePaise: 6500, isVeg: true, sortOrder: 3 });

  // ─── SOUTH SPECIAL ───────────────────────────────────────
  const south = await getOrCreateCategory("South Special - Idli, Dosa & More", 30);
  const dosaDesc = "Live baked & served with coconut chutney (2 pieces, 400 g)";
  await createItemIfNotExists({ categoryId: south.id, name: "Plain Dosa", description: dosaDesc, pricePaise: 4500, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: south.id, name: "Masala Dosa", description: dosaDesc, pricePaise: 5500, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: south.id, name: "Podi Plain Dosa", description: dosaDesc, pricePaise: 5000, isVeg: true, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: south.id, name: "Podi Masala Dosa", description: dosaDesc, pricePaise: 6000, isVeg: true, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: south.id, name: "Ghee Plain Dosa", description: dosaDesc, pricePaise: 6000, isVeg: true, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: south.id, name: "Ghee Masala Dosa", description: dosaDesc, pricePaise: 6500, isVeg: true, sortOrder: 6 });
  await createItemIfNotExists({ categoryId: south.id, name: "Egg Dosa", description: dosaDesc, pricePaise: 7000, isVeg: false, sortOrder: 7 });
  await createItemIfNotExists({ categoryId: south.id, name: "Set Dosa", description: dosaDesc, pricePaise: 5000, isVeg: true, sortOrder: 8 });
  await createItemIfNotExists({ categoryId: south.id, name: "Onion Uttapam", description: dosaDesc, pricePaise: 6000, isVeg: true, sortOrder: 9 });
  await createItemIfNotExists({ categoryId: south.id, name: "Besan Chilla", description: dosaDesc, pricePaise: 6000, isVeg: true, sortOrder: 10 });
  await createItemIfNotExists({ categoryId: south.id, name: "Moong Dal Chilla", description: dosaDesc, pricePaise: 6000, isVeg: true, sortOrder: 11 });
  await createItemIfNotExists({ categoryId: south.id, name: "Poha", description: "Freshly tossed rice flakes served with mixture, onion & lemon (250 g)", pricePaise: 4500, isVeg: true, sortOrder: 12 });
  await createItemIfNotExists({ categoryId: south.id, name: "Idli Vada", description: "Two idli & one vada served with sambar and chutney (400 g)", pricePaise: 4500, isVeg: true, sortOrder: 13 });
  await createItemIfNotExists({ categoryId: south.id, name: "Pasta", description: "Freshly made in white sauce (300 g)", pricePaise: 5000, isVeg: true, sortOrder: 14 });
  await createItemIfNotExists({ categoryId: south.id, name: "Poori Sabji", description: "Three pooris served with chole or veg kurma (400 g)", pricePaise: 5000, isVeg: true, sortOrder: 15 });
  await createItemIfNotExists({ categoryId: south.id, name: "Mandaki", description: undefined, pricePaise: 4000, isVeg: true, sortOrder: 16 });
  await createItemIfNotExists({ categoryId: south.id, name: "Shavige Bath", description: "Served with coconut chutney (300 g)", pricePaise: 4500, isVeg: true, sortOrder: 17 });
  await createItemIfNotExists({ categoryId: south.id, name: "Veg Upma", description: "Served with coconut chutney (300 g)", pricePaise: 4500, isVeg: true, sortOrder: 18 });
  await createItemIfNotExists({ categoryId: south.id, name: "Veg English Breakfast", description: "400 g", pricePaise: 5000, isVeg: true, sortOrder: 19 });
  await createItemIfNotExists({ categoryId: south.id, name: "Egg English Breakfast", description: "400 g", pricePaise: 6000, isVeg: false, sortOrder: 20 });

  // ─── EGG SPECIAL ─────────────────────────────────────────
  const eggs = await getOrCreateCategory("Egg Special", 40);
  await createItemIfNotExists({ categoryId: eggs.id, name: "Plain Omelette", description: "2 eggs cooked with salt & pepper (200 g)", pricePaise: 3500, isVeg: false, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Masala Omelette", description: "2 eggs with vegetables (250 g)", pricePaise: 4000, isVeg: false, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Cheese Omelette", description: "2 eggs cooked in cheese, salt & pepper (300 g)", pricePaise: 5000, isVeg: false, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Bread Omelette", description: "2 eggs and 2 slices of bread (300 g)", pricePaise: 4500, isVeg: false, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Bread Cheese Omelette", description: "2 eggs & 2 slices of bread cooked in cheese (300 g)", pricePaise: 5500, isVeg: false, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Scrambled Egg", description: "2 eggs live made (300 g)", pricePaise: 5000, isVeg: false, sortOrder: 6 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Egg Bhurji", description: "2 eggs live made (300 g)", pricePaise: 5000, isVeg: false, sortOrder: 7 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Boiled Egg", description: "2 eggs served with onion, tomato, salt & pepper (200 g)", pricePaise: 3000, isVeg: false, sortOrder: 8 });
  await createItemIfNotExists({ categoryId: eggs.id, name: "Half Boiled Egg", description: "2 eggs one side baked (200 g)", pricePaise: 4000, isVeg: false, sortOrder: 9 });

  // ─── MAGGI ───────────────────────────────────────────────
  const maggi = await getOrCreateCategory("Maggi", 50);
  await createItemIfNotExists({ categoryId: maggi.id, name: "Plain Maggi", description: "Freshly made (200 g)", pricePaise: 3500, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: maggi.id, name: "Veg Maggi", description: "Freshly made maggi with vegetables (250 g)", pricePaise: 4000, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: maggi.id, name: "Cheese Maggi", description: "Freshly made maggi with cheese (250 g)", pricePaise: 5000, isVeg: true, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: maggi.id, name: "Veg Cheese Maggi", description: "Freshly made maggi with vegetables and cheese (300 g)", pricePaise: 5500, isVeg: true, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: maggi.id, name: "Fried Maggi", description: "Freshly made maggi with vegetables (300 g)", pricePaise: 5000, isVeg: true, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: maggi.id, name: "Egg Maggi", description: "Freshly made maggi with egg (300 g)", pricePaise: 6000, isVeg: false, sortOrder: 6 });

  // ─── SNACKS ──────────────────────────────────────────────
  const snacks = await getOrCreateCategory("Snacks", 60);
  await createItemIfNotExists({ categoryId: snacks.id, name: "Samosa", description: undefined, pricePaise: 2500, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Dhokla", description: undefined, pricePaise: 2500, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Kachori", description: undefined, pricePaise: 2500, isVeg: true, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Vada Pav", description: undefined, pricePaise: 3000, isVeg: true, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Onion Pakoda", description: undefined, pricePaise: 4000, isVeg: true, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Bread Pakoda", description: undefined, pricePaise: 4500, isVeg: true, sortOrder: 6 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Veg Burger", description: undefined, pricePaise: 5000, isVeg: true, sortOrder: 7 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Cheese Burger", description: undefined, pricePaise: 6000, isVeg: true, sortOrder: 8 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "French Fries", description: undefined, pricePaise: 4500, isVeg: true, sortOrder: 9 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Peri Peri French Fries", description: undefined, pricePaise: 5500, isVeg: true, sortOrder: 10 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Cheese French Fries", description: undefined, pricePaise: 6000, isVeg: true, sortOrder: 11 });
  await createItemIfNotExists({ categoryId: snacks.id, name: "Honey Chilli Potato", description: undefined, pricePaise: 5000, isVeg: true, sortOrder: 12 });

  // ─── SANDWICHES & ROLLS ──────────────────────────────────
  const sandwiches = await getOrCreateCategory("Sandwiches & Rolls", 70);
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Veg Sandwich", description: undefined, pricePaise: 4500, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Veg Cheese Sandwich", description: undefined, pricePaise: 5500, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Egg Sandwich", description: undefined, pricePaise: 5500, isVeg: false, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Veg Roll", description: undefined, pricePaise: 5000, isVeg: true, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Egg Roll", description: undefined, pricePaise: 5500, isVeg: false, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Chicken Roll", description: undefined, pricePaise: 6500, isVeg: false, sortOrder: 6 });
  await createItemIfNotExists({ categoryId: sandwiches.id, name: "Chicken Egg Roll", description: undefined, pricePaise: 7000, isVeg: false, sortOrder: 7 });

  // ─── MEALS OPTIONS ───────────────────────────────────────
  const meals = await getOrCreateCategory("Meals Options", 80);
  await createItemIfNotExists({ categoryId: meals.id, name: "Full Meal", description: "Chapati + plain rice + flavoured rice + dal + veg dry + veg gravy + salad + sweet + papad (900 g)", pricePaise: 12000, isVeg: true, sortOrder: 1 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Veg Rice Combo", description: "Plain rice + dal + veg dry or veg gravy + salad + papad (800 g)", pricePaise: 9000, isVeg: true, sortOrder: 2 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Veg Roti Combo", description: "4 chapati + dal + veg dry or veg gravy + salad + papad (800 g)", pricePaise: 9000, isVeg: true, sortOrder: 3 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Non-Veg Meal", description: "Chapati + plain rice + flavoured rice + dal + chicken gravy + salad + sweet + papad (900 g)", pricePaise: 14000, isVeg: false, sortOrder: 4 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Rice Combo", description: "Plain rice + chicken curry + salad + papad (700 g)", pricePaise: 11000, isVeg: false, sortOrder: 5 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Roti Combo", description: "4 chapati + chicken curry + salad + papad (600 g)", pricePaise: 11000, isVeg: false, sortOrder: 6 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Biryani", description: "Chicken biryani + raita or salan + salad + sweet + papad (700 g)", pricePaise: 15000, isVeg: false, sortOrder: 7 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Biryani Rice (Khuska)", description: "Biryani rice + raita + salad + sweet + papad (700 g)", pricePaise: 8000, isVeg: true, sortOrder: 8 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chapati", description: "1 piece", pricePaise: 1200, isVeg: true, sortOrder: 9 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Plain Paratha", description: "1 piece", pricePaise: 1500, isVeg: true, sortOrder: 10 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Dal Tadka", description: "1 bowl (200 g)", pricePaise: 2500, isVeg: true, sortOrder: 11 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Plain Rice", description: "1 bowl (350 g)", pricePaise: 2500, isVeg: true, sortOrder: 12 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Dry Sabji", description: "1 bowl (200 g)", pricePaise: 2500, isVeg: true, sortOrder: 13 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Gravy Sabji", description: "1 bowl (200 g)", pricePaise: 3500, isVeg: true, sortOrder: 14 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Paneer Gravy", description: "1 bowl (250 g)", pricePaise: 4000, isVeg: true, sortOrder: 15 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Gravy", description: "1 bowl (250 g)", pricePaise: 6000, isVeg: false, sortOrder: 16 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Egg Bowl Curry", description: "1 bowl (250 g)", pricePaise: 5000, isVeg: false, sortOrder: 17 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Veg Fried Rice", description: "1 plate (600 g)", pricePaise: 7000, isVeg: true, sortOrder: 18 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Egg Fried Rice (Single Egg)", description: "1 plate (600 g)", pricePaise: 8000, isVeg: false, sortOrder: 19 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Egg Fried Rice Double Egg", description: "1 plate (650 g)", pricePaise: 9000, isVeg: false, sortOrder: 20 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Fried Rice", description: "1 plate (600 g)", pricePaise: 9000, isVeg: false, sortOrder: 21 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Egg Fried Rice", description: "1 plate (650 g)", pricePaise: 10000, isVeg: false, sortOrder: 22 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Paneer Fried Rice", description: "1 plate (600 g)", pricePaise: 10000, isVeg: true, sortOrder: 23 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Mushroom Fried Rice", description: "1 plate (600 g)", pricePaise: 9000, isVeg: true, sortOrder: 24 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chilli Chicken", description: "1 plate (400 g)", pricePaise: 7000, isVeg: false, sortOrder: 25 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Chicken Manchurian", description: "1 plate (400 g)", pricePaise: 7000, isVeg: false, sortOrder: 26 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Paneer Chilli", description: "1 plate (400 g)", pricePaise: 7000, isVeg: true, sortOrder: 27 });
  await createItemIfNotExists({ categoryId: meals.id, name: "Veg Ball Manchurian", description: "1 plate (400 g)", pricePaise: 6000, isVeg: true, sortOrder: 28 });

  console.log("\nGlobal menu seeding complete!");
  console.log("All items are now visible to every cafe automatically.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
