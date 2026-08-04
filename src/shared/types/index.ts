import type { OrderStatus, PaymentStatus, UserRole } from "@/generated/prisma";

// ─── API Response Types ─────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Cafe Types ─────────────────────────────────────────

export interface CafePublic {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  imageUrl: string | null;
  openingTime: string | null;
  closingTime: string | null;
}

export interface ActiveMenuMeta {
  id: string;
  type: string;
  isSubsidised: boolean;
}

export interface CafeMeta {
  cafe: CafePublic;
  activeMenu: ActiveMenuMeta | null;
}

// ─── Menu Types ─────────────────────────────────────────

export interface MenuCategoryWithItems {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemPublic[];
}

export interface MenuItemPublic {
  id: string;
  name: string;
  description: string | null;
  /** null when the active menu is subsidised — price is hidden, not just zero. */
  pricePaise: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string | null;
}

// ─── Cart Types ─────────────────────────────────────────

export interface CartItem {
  menuItemId: string;
  name: string;
  /** null when added from a subsidised menu — no price shown, no payment collected. */
  pricePaise: number | null;
  quantity: number;
  isVeg: boolean;
  imageUrl: string | null;
}

// ─── Order Types ────────────────────────────────────────

export interface CreateOrderRequest {
  cafeSlug: string;
  items: { menuItemId: string; quantity: number }[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  totalPaise: number;
  paymentRedirectUrl: string;
  /** An empty paymentRedirectUrl means "don't send the customer to a gateway",
   *  which covers two opposite situations: a fully subsidised order that is
   *  already PAID, and an idempotent replay of an order still awaiting payment.
   *  Clients must branch on this rather than on the empty string, or they will
   *  show a receipt for an order nobody has paid for. */
  orderStatus: OrderStatus;
  /** Present only for the native-QR flow (RAZORPAY_USE_QR): the hosted image
   *  URL of the single-use dynamic UPI QR the kiosk renders itself instead of
   *  opening Razorpay's Standard Checkout in a WebView. Absent for the WebView,
   *  PhonePe, and subsidised paths — those keep using paymentRedirectUrl. */
  paymentQrImageUrl?: string;
  /** The `qr_…` id backing the QR (stored in the same column as `order_`/`plink_`
   *  ids); returned for debugging/traceability. */
  paymentQrId?: string;
  /** The merchant transaction id the kiosk polls /reconcile with. Only needed
   *  by the QR flow, where there is no return-URL redirect to carry it. */
  merchantTxnId?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPaise: number;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  cafeName: string | null;
  /** True only when nothing at all was charged (whole menu subsidised, or
   *  every item individually was) — false for a mixed paid+subsidised order. */
  isSubsidised: boolean;
  /** What was actually collected — equals totalPaise when nothing was
   *  subsidised, 0 when fully subsidised, partial for a mixed cart. */
  chargeablePaise: number;
  items: OrderItemSummary[];
}

export interface OrderItemSummary {
  id: string;
  itemName: string;
  itemPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  isSubsidised: boolean;
}

// ─── Dashboard Types ────────────────────────────────────

export interface DashboardOrder extends OrderSummary {
  updatedAt: string;
  cafeId?: string;
  cafeSlug?: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
}

// ─── Admin Types ────────────────────────────────────────

export interface CafeStats {
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  todayOrders: number;
  todayRevenue: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  activeCafes: number;
  todayRevenue: number;
  todayOrders: number;
  cafeStats: CafeStats[];
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cafeId: string | null;
  cafeName?: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  cafeId?: string;
}

// ─── Deep Insights (Admin) ──────────────────────────────

export interface TopItemInsight {
  menuItemId: string;
  name: string;
  quantitySold: number;
  revenuePaise: number;
}

export interface CafeInsights {
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValuePaise: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatRate: number; // 0..1
  peakHour: number | null; // 0..23
  peakHourOrders: number;
  peakDayOfWeek: number | null; // 0=Sun..6=Sat
  peakDayOrders: number;
  hourHistogram: number[]; // length 24
  dayHistogram: number[]; // length 7
  last7DaysRevenue: { date: string; revenuePaise: number; orders: number }[];
  topItemsByQuantity: TopItemInsight[];
  topItemByRevenue: TopItemInsight | null;
  mostUsedTable: { tableNumber: string; orders: number } | null;
  lastOrderAt: string | null;
}

export interface DeepInsightsResponse {
  windowDays: number;
  generatedAt: string;
  cafes: CafeInsights[];
}

// ─── Payment Types ──────────────────────────────────────

export interface PaymentInfo {
  id: string;
  status: PaymentStatus;
  amountPaise: number;
  merchantTxnId: string;
  phonepeTxnId: string | null;
  paidAt: string | null;
}

// ─── Feedback Types ─────────────────────────────────────

export type FeedbackMealSession = "BREAKFAST" | "LUNCH" | "SNACKS";
export type FeedbackFoodQuality = "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT";
export type FeedbackCleanliness = "VERY_CLEAN" | "MOSTLY_CLEAN" | "OFTEN_DIRTY";
export type FeedbackMenuVariety = "GREAT" | "DECENT" | "NOT_ENOUGH_VARIETY";
export type FeedbackOverallExperience = "EXCELLENT" | "GOOD" | "POOR";

export interface FeedbackEntry {
  id: string;
  cafeId: string;
  cafeName?: string;
  rating: number;
  comment: string | null;
  /** Survey fields — null on entries left before the survey replaced the star rating. */
  customerName: string | null;
  mealSession: FeedbackMealSession | null;
  foodQuality: FeedbackFoodQuality | null;
  cleanliness: FeedbackCleanliness | null;
  menuVariety: FeedbackMenuVariety | null;
  overallExperience: FeedbackOverallExperience | null;
  createdAt: string;
}

export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
}

/** Cafeteria survey submitted from the kiosk home screen. */
export interface SubmitFeedbackSurveyRequest {
  customerName: string;
  mealSession: FeedbackMealSession;
  foodQuality: FeedbackFoodQuality;
  cleanliness: FeedbackCleanliness;
  menuVariety: FeedbackMenuVariety;
  overallExperience: FeedbackOverallExperience;
}

/**
 * The survey as the customer sees it, in order. The kiosk app keeps its own
 * copy of this list in Dart (kiosk-app/lib/screens/feedback/cafe_feedback_screen.dart)
 * - keep the two in step when a question changes.
 */
export interface FeedbackSurveyQuestion {
  key: Exclude<keyof SubmitFeedbackSurveyRequest, "customerName">;
  prompt: string;
  options: string[];
}

export const FEEDBACK_SURVEY_QUESTIONS: FeedbackSurveyQuestion[] = [
  {
    key: "mealSession",
    prompt: "Meal Session",
    options: ["BREAKFAST", "LUNCH", "SNACKS"],
  },
  {
    key: "foodQuality",
    prompt: "How would you rate the taste and quality of the food?",
    options: ["EXCELLENT", "GOOD", "AVERAGE", "NEEDS_IMPROVEMENT"],
  },
  {
    key: "cleanliness",
    prompt: "How clean and hygienic is the cafeteria seating and serving area?",
    options: ["VERY_CLEAN", "MOSTLY_CLEAN", "OFTEN_DIRTY"],
  },
  {
    key: "menuVariety",
    prompt: "How do you feel about the menu variety and options?",
    options: ["GREAT", "DECENT", "NOT_ENOUGH_VARIETY"],
  },
  {
    key: "overallExperience",
    prompt: "How would you rate your overall experience at the cafeteria?",
    options: ["EXCELLENT", "GOOD", "POOR"],
  },
];

/** The questions a meal session breaks down into - the session itself groups them. */
export type FeedbackQuestionKey = Exclude<
  keyof SubmitFeedbackSurveyRequest,
  "customerName" | "mealSession"
>;

export interface FeedbackAnswerCount {
  /** Enum name; label it with FEEDBACK_ANSWER_LABELS. */
  value: string;
  count: number;
  /** Share of the answers given to this question in this session, 0-100. */
  pct: number;
}

export interface FeedbackQuestionBreakdown {
  key: FeedbackQuestionKey;
  /** Every option, including ones nobody picked, in the order customers saw them. */
  options: FeedbackAnswerCount[];
}

/**
 * Per-meal-session rollup shown on the owner dashboard. Covers survey
 * submissions only - entries left before the survey carry no meal session, so
 * there is nothing to attribute them to.
 */
export interface FeedbackSessionStats {
  session: FeedbackMealSession;
  responses: number;
  questions: FeedbackQuestionBreakdown[];
}

export const FEEDBACK_ANSWER_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "Snacks",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  VERY_CLEAN: "Very Clean",
  MOSTLY_CLEAN: "Mostly Clean",
  OFTEN_DIRTY: "Often Dirty",
  GREAT: "Great",
  DECENT: "Decent",
  NOT_ENOUGH_VARIETY: "Not Enough Variety",
  POOR: "Poor",
};

// ─── SSE Event Types ────────────────────────────────────

export interface SSEOrderEvent {
  type: "new_order" | "order_updated";
  order: DashboardOrder;
}
