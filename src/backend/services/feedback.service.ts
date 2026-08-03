import { feedbackRepository } from "@/backend/repositories/feedback.repository";
import { menuRepository } from "@/backend/repositories/menu.repository";
import type {
  FeedbackCleanliness,
  FeedbackEntry,
  FeedbackFoodQuality,
  FeedbackMealSession,
  FeedbackMenuVariety,
  FeedbackOverallExperience,
  SubmitFeedbackSurveyRequest,
} from "@/shared/types";

const MAX_COMMENT_LEN = 1000;
const MAX_NAME_LEN = 80;

const MEAL_SESSIONS: FeedbackMealSession[] = ["BREAKFAST", "LUNCH", "SNACKS"];
const FOOD_QUALITIES: FeedbackFoodQuality[] = ["EXCELLENT", "GOOD", "AVERAGE", "NEEDS_IMPROVEMENT"];
const CLEANLINESS: FeedbackCleanliness[] = ["VERY_CLEAN", "MOSTLY_CLEAN", "OFTEN_DIRTY"];
const MENU_VARIETIES: FeedbackMenuVariety[] = ["GREAT", "DECENT", "NOT_ENOUGH_VARIETY"];
const OVERALL_EXPERIENCES: FeedbackOverallExperience[] = ["EXCELLENT", "GOOD", "POOR"];

/**
 * The survey has no star rating, but `rating` still drives the average shown on
 * the admin and owner dashboards (and older entries), so map the overall
 * experience onto the same 1-5 scale.
 */
const OVERALL_TO_RATING: Record<FeedbackOverallExperience, number> = {
  EXCELLENT: 5,
  GOOD: 3,
  POOR: 1,
};

export const feedbackService = {
  async createFeedback(cafeSlug: string, rating: number, comment?: string): Promise<FeedbackEntry> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("rating must be an integer between 1 and 5");
    }
    if (comment !== undefined && comment.length > MAX_COMMENT_LEN) {
      throw new Error(`comment cannot exceed ${MAX_COMMENT_LEN} characters`);
    }

    const cafe = await this.requireActiveCafe(cafeSlug);
    const created = await feedbackRepository.createFeedback({ cafeId: cafe.id, rating, comment });
    return mapEntry(created);
  },

  /** Structured cafeteria survey submitted from the kiosk home screen. */
  async createSurveyFeedback(
    cafeSlug: string,
    input: SubmitFeedbackSurveyRequest
  ): Promise<FeedbackEntry> {
    const customerName = typeof input.customerName === "string" ? input.customerName.trim() : "";
    if (!customerName) {
      throw new Error("Name is required");
    }
    if (customerName.length > MAX_NAME_LEN) {
      throw new Error(`Name cannot exceed ${MAX_NAME_LEN} characters`);
    }

    const mealSession = requireAnswer(input.mealSession, MEAL_SESSIONS, "mealSession");
    const foodQuality = requireAnswer(input.foodQuality, FOOD_QUALITIES, "foodQuality");
    const cleanliness = requireAnswer(input.cleanliness, CLEANLINESS, "cleanliness");
    const menuVariety = requireAnswer(input.menuVariety, MENU_VARIETIES, "menuVariety");
    const overallExperience = requireAnswer(
      input.overallExperience,
      OVERALL_EXPERIENCES,
      "overallExperience"
    );

    const cafe = await this.requireActiveCafe(cafeSlug);
    const created = await feedbackRepository.createFeedback({
      cafeId: cafe.id,
      rating: OVERALL_TO_RATING[overallExperience],
      customerName,
      mealSession,
      foodQuality,
      cleanliness,
      menuVariety,
      overallExperience,
    });
    return mapEntry(created);
  },

  async requireActiveCafe(cafeSlug: string) {
    const cafe = await menuRepository.getCafeBySlug(cafeSlug);
    if (!cafe || !cafe.isActive) {
      throw new Error("Cafe not found or inactive");
    }
    return cafe;
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

function requireAnswer<T extends string>(value: unknown, allowed: T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function mapEntry(entry: {
  id: string;
  cafeId: string;
  rating: number;
  comment: string | null;
  customerName?: string | null;
  mealSession?: FeedbackMealSession | null;
  foodQuality?: FeedbackFoodQuality | null;
  cleanliness?: FeedbackCleanliness | null;
  menuVariety?: FeedbackMenuVariety | null;
  overallExperience?: FeedbackOverallExperience | null;
  createdAt: Date;
}): FeedbackEntry {
  return {
    id: entry.id,
    cafeId: entry.cafeId,
    rating: entry.rating,
    comment: entry.comment,
    customerName: entry.customerName ?? null,
    mealSession: entry.mealSession ?? null,
    foodQuality: entry.foodQuality ?? null,
    cleanliness: entry.cleanliness ?? null,
    menuVariety: entry.menuVariety ?? null,
    overallExperience: entry.overallExperience ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}
