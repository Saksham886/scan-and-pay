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
