import { feedbackRepository } from "@/backend/repositories/feedback.repository";
import { menuRepository } from "@/backend/repositories/menu.repository";
import type {
  FeedbackCleanliness,
  FeedbackEntry,
  FeedbackFoodQuality,
  FeedbackMealSession,
  FeedbackMenuVariety,
  FeedbackOverallExperience,
  FeedbackSessionStats,
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

/**
 * Answers that count as positive in the per-session dashboard percentages.
 * "Mostly clean" and "Decent" sit on the positive side deliberately - they read
 * as "no complaint", and an owner watching for trouble wants the share of
 * customers who did complain to stand out.
 */
const POSITIVE_FOOD_QUALITY: FeedbackFoodQuality[] = ["EXCELLENT", "GOOD"];
const POSITIVE_CLEANLINESS: FeedbackCleanliness[] = ["VERY_CLEAN", "MOSTLY_CLEAN"];
const POSITIVE_MENU_VARIETY: FeedbackMenuVariety[] = ["GREAT", "DECENT"];

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

  /**
   * Breakfast/lunch/snacks rollup for the owner dashboard. Every session is
   * returned even with no responses, so the row keeps its shape instead of
   * reflowing as feedback trickles in over the day.
   */
  async getSessionStatsForCafe(cafeId: string): Promise<FeedbackSessionStats[]> {
    const rows = await feedbackRepository.getSurveyAnswersForCafe(cafeId);

    return MEAL_SESSIONS.map((session) => {
      const forSession = rows.filter((row) => row.mealSession === session);
      if (forSession.length === 0) {
        return {
          session,
          responses: 0,
          averageRating: null,
          foodPositivePct: null,
          cleanlinessPositivePct: null,
          varietyPositivePct: null,
        };
      }

      const ratingTotal = forSession.reduce((sum, row) => sum + row.rating, 0);
      return {
        session,
        responses: forSession.length,
        averageRating: ratingTotal / forSession.length,
        foodPositivePct: sharePositive(
          forSession.map((row) => row.foodQuality),
          POSITIVE_FOOD_QUALITY
        ),
        cleanlinessPositivePct: sharePositive(
          forSession.map((row) => row.cleanliness),
          POSITIVE_CLEANLINESS
        ),
        varietyPositivePct: sharePositive(
          forSession.map((row) => row.menuVariety),
          POSITIVE_MENU_VARIETY
        ),
      };
    });
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

/**
 * Share of answers that fall in [positive], 0-100. Skips unanswered questions
 * rather than counting them against the session - a legacy row that never asked
 * about cleanliness isn't evidence the place was dirty.
 */
function sharePositive<T extends string>(answers: (T | null)[], positive: T[]): number | null {
  const answered = answers.filter((answer): answer is T => answer !== null);
  if (answered.length === 0) return null;
  return (answered.filter((answer) => positive.includes(answer)).length / answered.length) * 100;
}

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
