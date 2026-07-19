import { adminRepository } from "@/backend/repositories/admin.repository";
import { orderRepository } from "@/backend/repositories/order.repository";
import type { OrderStatus } from "@/generated/prisma";
import type { AnalyticsOverview } from "@/shared/types";

export const analyticsService = {
  async getOverview(): Promise<AnalyticsOverview> {
    return adminRepository.getAnalyticsOverview();
  },

  async getCafeOrders(
    cafeId: string | null,
    options?: {
      status?: string[];
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    return orderRepository.getOrdersForCafe(cafeId, {
      status: options?.status as OrderStatus[] | undefined,
      limit: options?.limit,
      offset: options?.offset,
      dateFrom: options?.dateFrom ? new Date(options.dateFrom) : undefined,
      dateTo: options?.dateTo ? new Date(options.dateTo) : undefined,
    });
  },
};
