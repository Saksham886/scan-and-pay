import { feedbackRepository } from "@/backend/repositories/feedback.repository";
import { menuRepository } from "@/backend/repositories/menu.repository";
import type { FeedbackEntry } from "@/shared/types";

const MAX_COMMENT_LEN = 1000;

export const feedbackService = {
  async createFeedback(cafeSlug: string, rating: number, comment?: string): Promise<FeedbackEntry> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("rating must be an integer between 1 and 5");
    }
    if (comment !== undefined && comment.length > MAX_COMMENT_LEN) {
      throw new Error(`comment cannot exceed ${MAX_COMMENT_LEN} characters`);
    }

    const cafe = await menuRepository.getCafeBySlug(cafeSlug);
    if (!cafe || !cafe.isActive) {
      throw new Error("Cafe not found or inactive");
    }

    const created = await feedbackRepository.createFeedback({ cafeId: cafe.id, rating, comment });
    return {
      id: created.id,
      cafeId: created.cafeId,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async getFeedbackForCafe(cafeId: string, options?: { limit?: number; offset?: number }) {
    const { entries, total, averageRating } = await feedbackRepository.getFeedbackForCafe(cafeId, options);
    return {
      entries: entries.map(mapEntry),
      total,
      averageRating,
    };
  },

  async getAllFeedback(options?: { cafeId?: string; limit?: number; offset?: number }) {
    const { entries, total, averageRating } = await feedbackRepository.getAllFeedback(options);
    return {
      entries: entries.map((e) => ({ ...mapEntry(e), cafeName: e.cafe?.name })),
      total,
      averageRating,
    };
  },
};

function mapEntry(entry: {
  id: string;
  cafeId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}): FeedbackEntry {
  return {
    id: entry.id,
    cafeId: entry.cafeId,
    rating: entry.rating,
    comment: entry.comment,
    createdAt: entry.createdAt.toISOString(),
  };
}
