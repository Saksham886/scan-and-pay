import { prisma } from "@/backend/lib/db";
import type {
  FeedbackCleanliness,
  FeedbackFoodQuality,
  FeedbackMealSession,
  FeedbackMenuVariety,
  FeedbackOverallExperience,
} from "@/shared/types";

export const feedbackRepository = {
  async createFeedback(data: {
    cafeId: string;
    rating: number;
    comment?: string;
    customerName?: string;
    mealSession?: FeedbackMealSession;
    foodQuality?: FeedbackFoodQuality;
    cleanliness?: FeedbackCleanliness;
    menuVariety?: FeedbackMenuVariety;
    overallExperience?: FeedbackOverallExperience;
  }) {
    return prisma.feedback.create({
      data: {
        cafeId: data.cafeId,
        rating: data.rating,
        comment: data.comment,
        customerName: data.customerName,
        mealSession: data.mealSession,
        foodQuality: data.foodQuality,
        cleanliness: data.cleanliness,
        menuVariety: data.menuVariety,
        overallExperience: data.overallExperience,
      },
    });
  },

  /**
   * Answer columns for every survey row of one cafe, feeding the per-session
   * rollup on the owner dashboard. Rolled up in the service rather than by
   * groupBy: each question's distribution would otherwise cost its own query,
   * and a single cafe's feedback is small enough to fold in memory.
   */
  async getSurveyAnswersForCafe(cafeId: string) {
    return prisma.feedback.findMany({
      where: { cafeId, mealSession: { not: null } },
      select: {
        mealSession: true,
        foodQuality: true,
        cleanliness: true,
        menuVariety: true,
        overallExperience: true,
      },
    });
  },

  async getFeedbackForCafe(cafeId: string, options?: { limit?: number; offset?: number }) {
    const [entries, total, avg] = await Promise.all([
      prisma.feedback.findMany({
        where: { cafeId },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.feedback.count({ where: { cafeId } }),
      prisma.feedback.aggregate({ where: { cafeId }, _avg: { rating: true } }),
    ]);
    return { entries, total, averageRating: avg._avg.rating };
  },

  async getAllFeedback(options?: { cafeId?: string; limit?: number; offset?: number }) {
    const where = options?.cafeId ? { cafeId: options.cafeId } : {};
    const [entries, total, avg] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: { cafe: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.feedback.count({ where }),
      prisma.feedback.aggregate({ where, _avg: { rating: true } }),
    ]);
    return { entries, total, averageRating: avg._avg.rating };
  },
};
