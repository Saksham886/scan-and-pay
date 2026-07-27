-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('BREAKFAST', 'LUNCH', 'EVENING_SNACKS', 'DINNER');

-- AlterTable
ALTER TABLE "menu_categories" ADD COLUMN     "menu_id" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "menu_id" TEXT;

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "cafe_id" TEXT NOT NULL,
    "type" "MenuType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_subsidised" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "cafe_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menus_cafe_id_is_active_idx" ON "menus"("cafe_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "menus_cafe_id_type_key" ON "menus"("cafe_id", "type");

-- CreateIndex
CREATE INDEX "feedback_cafe_id_created_at_idx" ON "feedback"("cafe_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "menu_categories_menu_id_is_active_idx" ON "menu_categories"("menu_id", "is_active");

-- CreateIndex
CREATE INDEX "menu_items_menu_id_is_available_idx" ON "menu_items"("menu_id", "is_available");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Defense-in-depth: at most one active menu per cafe. Enforced primarily at the
-- application layer in menuRepository.setActiveMenu (transaction that clears
-- other menus before activating the target); Prisma schema can't express a
-- partial index, so it's hand-added here.
CREATE UNIQUE INDEX "one_active_menu_per_cafe" ON "menus"("cafe_id") WHERE "is_active" = true;
