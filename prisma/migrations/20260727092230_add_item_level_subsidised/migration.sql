-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "is_subsidised" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "is_subsidised" BOOLEAN NOT NULL DEFAULT false;
