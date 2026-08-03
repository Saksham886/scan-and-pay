-- CreateEnum
CREATE TYPE "FeedbackMealSession" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACKS');

-- CreateEnum
CREATE TYPE "FeedbackFoodQuality" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT');

-- CreateEnum
CREATE TYPE "FeedbackCleanliness" AS ENUM ('VERY_CLEAN', 'MOSTLY_CLEAN', 'OFTEN_DIRTY');

-- CreateEnum
CREATE TYPE "FeedbackMenuVariety" AS ENUM ('GREAT', 'DECENT', 'NOT_ENOUGH_VARIETY');

-- CreateEnum
CREATE TYPE "FeedbackOverallExperience" AS ENUM ('EXCELLENT', 'GOOD', 'POOR');

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "meal_session" "FeedbackMealSession",
ADD COLUMN     "food_quality" "FeedbackFoodQuality",
ADD COLUMN     "cleanliness" "FeedbackCleanliness",
ADD COLUMN     "menu_variety" "FeedbackMenuVariety",
ADD COLUMN     "overall_experience" "FeedbackOverallExperience";
