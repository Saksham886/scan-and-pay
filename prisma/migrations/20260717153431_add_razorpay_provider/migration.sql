-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PHONEPE', 'RAZORPAY');

-- AlterTable
ALTER TABLE "cafes" ADD COLUMN     "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'PHONEPE',
ADD COLUMN     "razorpay_key_id" TEXT,
ADD COLUMN     "razorpay_key_secret" TEXT,
ADD COLUMN     "razorpay_webhook_secret" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'PHONEPE',
ADD COLUMN     "razorpay_order_id" TEXT,
ADD COLUMN     "razorpay_payment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

