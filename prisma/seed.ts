// @ts-nocheck
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "crypto";

// Use DIRECT_DATABASE_URL if set, otherwise fall back to DATABASE_URL
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

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Seeding database...\n");

  // Create Cafes
  const cafes = await Promise.all([
    prisma.cafe.upsert({
      where: { slug: "koramangala" },
      update: {},
      create: {
        name: "Brew & Bites Koramangala",
        slug: "koramangala",
        address: "123 5th Block, Koramangala, Bangalore",
        phone: "+91-9876543210",
        openingTime: "08:00",
        closingTime: "22:00",
      },
    }),
    prisma.cafe.upsert({
      where: { slug: "indiranagar" },
      update: {},
      create: {
        name: "Brew & Bites Indiranagar",
        slug: "indiranagar",
        address: "45 12th Main, Indiranagar, Bangalore",
        phone: "+91-9876543211",
        openingTime: "08:00",
        closingTime: "23:00",
      },
    }),
    prisma.cafe.upsert({
      where: { slug: "hsr-layout" },
      update: {},
      create: {
        name: "Brew & Bites HSR",
        slug: "hsr-layout",
        address: "78 Sector 2, HSR Layout, Bangalore",
        phone: "+91-9876543212",
        openingTime: "09:00",
        closingTime: "21:00",
      },
    }),
    prisma.cafe.upsert({
      where: { slug: "whitefield" },
      update: {},
      create: {
        name: "Brew & Bites Whitefield",
        slug: "whitefield",
        address: "22 ITPL Road, Whitefield, Bangalore",
        phone: "+91-9876543213",
        openingTime: "07:30",
        closingTime: "22:30",
      },
    }),
  ]);

  console.log(`Created ${cafes.length} cafes`);

  // Create Super Admin
  await prisma.user.upsert({
    where: { email: "admin@cafeorder.com" },
    update: { passwordHash: hashPassword("Admin@Demo1234") },
    create: {
      email: "admin@cafeorder.com",
      passwordHash: hashPassword("Admin@Demo1234"),
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  // Create Cafe Owners
  for (const cafe of cafes) {
    const ownerEmail = `owner@${cafe.slug}.com`;
    await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { passwordHash: hashPassword("Owner@Demo1234") },
      create: {
        email: ownerEmail,
        passwordHash: hashPassword("Owner@Demo1234"),
        name: `${cafe.name} Owner`,
        role: "CAFE_OWNER",
        cafeId: cafe.id,
      },
    });
  }

  console.log("Created admin and cafe owner accounts");

  // Create Menu Categories and Items for each cafe
  for (const cafe of cafes) {
    const categories = await Promise.all([
      prisma.menuCategory.create({
        data: { cafeId: cafe.id, name: "Hot Beverages", sortOrder: 1 },
      }),
      prisma.menuCategory.create({
        data: { cafeId: cafe.id, name: "Cold Beverages", sortOrder: 2 },
      }),
      prisma.menuCategory.create({
        data: { cafeId: cafe.id, name: "Snacks", sortOrder: 3 },
      }),
      prisma.menuCategory.create({
        data: { cafeId: cafe.id, name: "Meals", sortOrder: 4 },
      }),
      prisma.menuCategory.create({
        data: { cafeId: cafe.id, name: "Desserts", sortOrder: 5 },
      }),
    ]);

    const [hot, cold, snacks, meals, desserts] = categories;

    await prisma.menuItem.createMany({
      data: [
        // Hot Beverages
        { cafeId: cafe.id, categoryId: hot.id, name: "Masala Chai", description: "Classic Indian spiced tea", pricePaise: 5000, isVeg: true, sortOrder: 1 },
        { cafeId: cafe.id, categoryId: hot.id, name: "Cappuccino", description: "Rich espresso with steamed milk foam", pricePaise: 17900, isVeg: true, sortOrder: 2 },
        { cafeId: cafe.id, categoryId: hot.id, name: "Latte", description: "Smooth espresso with silky steamed milk", pricePaise: 18900, isVeg: true, sortOrder: 3 },
        { cafeId: cafe.id, categoryId: hot.id, name: "Americano", description: "Bold espresso with hot water", pricePaise: 14900, isVeg: true, sortOrder: 4 },
        { cafeId: cafe.id, categoryId: hot.id, name: "Hot Chocolate", description: "Creamy Belgian chocolate drink", pricePaise: 19900, isVeg: true, sortOrder: 5 },
        { cafeId: cafe.id, categoryId: hot.id, name: "Green Tea", description: "Refreshing Japanese green tea", pricePaise: 9900, isVeg: true, sortOrder: 6 },

        // Cold Beverages
        { cafeId: cafe.id, categoryId: cold.id, name: "Iced Americano", description: "Chilled espresso over ice", pricePaise: 16900, isVeg: true, sortOrder: 1 },
        { cafeId: cafe.id, categoryId: cold.id, name: "Cold Brew", description: "Slow-brewed, smooth and strong", pricePaise: 19900, isVeg: true, sortOrder: 2 },
        { cafeId: cafe.id, categoryId: cold.id, name: "Mango Smoothie", description: "Fresh Alphonso mango blended smooth", pricePaise: 22900, isVeg: true, sortOrder: 3 },
        { cafeId: cafe.id, categoryId: cold.id, name: "Berry Blast", description: "Mixed berries with yoghurt", pricePaise: 24900, isVeg: true, sortOrder: 4 },
        { cafeId: cafe.id, categoryId: cold.id, name: "Iced Chai Latte", description: "Spiced chai served cold with milk", pricePaise: 15900, isVeg: true, sortOrder: 5 },

        // Snacks
        { cafeId: cafe.id, categoryId: snacks.id, name: "Veg Sandwich", description: "Grilled veggies with cheese on sourdough", pricePaise: 17900, isVeg: true, sortOrder: 1 },
        { cafeId: cafe.id, categoryId: snacks.id, name: "Chicken Club Sandwich", description: "Triple-decker with grilled chicken and bacon", pricePaise: 24900, isVeg: false, sortOrder: 2 },
        { cafeId: cafe.id, categoryId: snacks.id, name: "Paneer Wrap", description: "Spiced paneer tikka in a wheat wrap", pricePaise: 19900, isVeg: true, sortOrder: 3 },
        { cafeId: cafe.id, categoryId: snacks.id, name: "Chicken Wrap", description: "Tandoori chicken with mint chutney", pricePaise: 22900, isVeg: false, sortOrder: 4 },
        { cafeId: cafe.id, categoryId: snacks.id, name: "French Fries", description: "Crispy golden fries with dipping sauce", pricePaise: 14900, isVeg: true, sortOrder: 5 },
        { cafeId: cafe.id, categoryId: snacks.id, name: "Garlic Bread", description: "Toasted with herb butter and cheese", pricePaise: 12900, isVeg: true, sortOrder: 6 },

        // Meals
        { cafeId: cafe.id, categoryId: meals.id, name: "Pasta Alfredo", description: "Creamy white sauce penne pasta", pricePaise: 27900, isVeg: true, sortOrder: 1 },
        { cafeId: cafe.id, categoryId: meals.id, name: "Chicken Pasta", description: "Penne in spicy arrabbiata with grilled chicken", pricePaise: 31900, isVeg: false, sortOrder: 2 },
        { cafeId: cafe.id, categoryId: meals.id, name: "Margherita Pizza", description: "Classic tomato, mozzarella and basil", pricePaise: 29900, isVeg: true, sortOrder: 3 },
        { cafeId: cafe.id, categoryId: meals.id, name: "Butter Chicken Rice Bowl", description: "Creamy butter chicken with steamed rice", pricePaise: 29900, isVeg: false, sortOrder: 4 },
        { cafeId: cafe.id, categoryId: meals.id, name: "Paneer Tikka Rice Bowl", description: "Chargrilled paneer with flavoured rice", pricePaise: 26900, isVeg: true, sortOrder: 5 },

        // Desserts
        { cafeId: cafe.id, categoryId: desserts.id, name: "Chocolate Brownie", description: "Warm fudge brownie with vanilla ice cream", pricePaise: 19900, isVeg: true, sortOrder: 1 },
        { cafeId: cafe.id, categoryId: desserts.id, name: "Cheesecake", description: "New York style baked cheesecake", pricePaise: 24900, isVeg: true, sortOrder: 2 },
        { cafeId: cafe.id, categoryId: desserts.id, name: "Gulab Jamun", description: "Warm milk dumplings in sugar syrup", pricePaise: 12900, isVeg: true, sortOrder: 3 },
        { cafeId: cafe.id, categoryId: desserts.id, name: "Tiramisu", description: "Italian coffee-flavoured layered dessert", pricePaise: 27900, isVeg: true, sortOrder: 4 },
      ],
    });

    console.log(`Created menu for ${cafe.name}`);
  }

  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Super Admin: admin@cafeorder.com / Admin@Demo1234");
  console.log("  Cafe Owner:  owner@koramangala.com / Owner@Demo1234");
  console.log("               owner@indiranagar.com / Owner@Demo1234");
  console.log("               owner@hsr-layout.com / Owner@Demo1234");
  console.log("               owner@whitefield.com / Owner@Demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
