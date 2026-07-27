-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "overridden_from_id" TEXT;

-- CreateIndex
CREATE INDEX "menu_items_overridden_from_id_idx" ON "menu_items"("overridden_from_id");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_overridden_from_id_fkey" FOREIGN KEY ("overridden_from_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
