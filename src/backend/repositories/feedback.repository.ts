import { prisma } from "@/backend/lib/db";

export const feedbackRepository = {
  async createFeedback(data: { cafeId: string; rating: number; comment?: string }) {
    return prisma.feedback.create({
      data: {
        cafeId: data.cafeId,
        rating: data.rating,
        comment: data.comment,
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
