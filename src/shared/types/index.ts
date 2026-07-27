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

export interface FeedbackEntry {
  id: string;
  cafeId: string;
  cafeName?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
}

// ─── SSE Event Types ────────────────────────────────────

export interface SSEOrderEvent {
  type: "new_order" | "order_updated";
  order: DashboardOrder;
}
