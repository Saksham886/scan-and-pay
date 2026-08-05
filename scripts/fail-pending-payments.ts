// @ts-nocheck
// One-off cleanup: marks every stuck PAYMENT_PENDING order (and its INITIATED
// payment record) as FAILED, clearing pending payments that never completed.
// Run with: npx tsx scripts/fail-pending-payments.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL!;
const cleanUrl = url.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");
const adapter = new PrismaPg({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const pendingOrders = await prisma.order.count({ where: { status: "PAYMENT_PENDING" } });
  const initiatedPayments = await prisma.payment.count({ where: { status: "INITIATED" } });

  console.log(`Pending orders (PAYMENT_PENDING): ${pendingOrders}`);
  console.log(`Pending payments (INITIATED):     ${initiatedPayments}`);

  if (pendingOrders === 0 && initiatedPayments === 0) {
    console.log("\nNothing to update.");
    return;
  }

  const orderRes = await prisma.order.updateMany({
    where: { status: "PAYMENT_PENDING" },
    data: { status: "FAILED" },
  });
  const paymentRes = await prisma.payment.updateMany({
    where: { status: "INITIATED" },
    data: { status: "FAILED" },
  });

  console.log(`\nMarked ${orderRes.count} order(s) FAILED.`);
  console.log(`Marked ${paymentRes.count} payment(s) FAILED.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
