import { prisma } from "@/backend/lib/db";
import type { OrderStatus } from "@/generated/prisma";

export const orderRepository = {
  async findByIdempotencyKey(key: string) {
    return prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  async createOrder(data: {
    cafeId: string;
    orderNumber: string;
    totalPaise: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
    idempotencyKey: string;
    items: {
      menuItemId: string;
      itemName: string;
      itemPricePaise: number;
      quantity: number;
      subtotalPaise: number;
      isSubsidised: boolean;
    }[];
  }) {
    return prisma.order.create({
      data: {
        cafeId: data.cafeId,
        orderNumber: data.orderNumber,
        totalPaise: data.totalPaise,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes,
        idempotencyKey: data.idempotencyKey,
        items: {
          create: data.items,
        },
      },
      include: { items: true },
    });
  },

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        cafe: { select: { slug: true, name: true } },
      },
    });
  },

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  async getOrdersForCafe(
    cafeId: string | null,
    options?: {
      status?: OrderStatus[];
      limit?: number;
      offset?: number;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    const where: Record<string, unknown> = {};
    if (cafeId) where.cafeId = cafeId;

    if (options?.status?.length) {
      where.status = { in: options.status };
    }
    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {
        ...(options?.dateFrom && { gte: options.dateFrom }),
        ...(options?.dateTo && { lte: options.dateTo }),
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          cafe: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  },

  async setRating(orderId: string, rating: number) {
    return prisma.order.update({
      where: { id: orderId },
      data: { rating },
    });
  },

  async getStaleOrders(minutesOld: number) {
    const cutoff = new Date(Date.now() - minutesOld * 60 * 1000);
    return prisma.order.findMany({
      where: {
        status: { in: ["CREATED", "PAYMENT_PENDING"] },
        createdAt: { lt: cutoff },
      },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },
};
