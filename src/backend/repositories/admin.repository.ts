import { prisma } from "@/backend/lib/db";
import type { UserRole, PaymentProvider } from "@/generated/prisma";

export const adminRepository = {
  async getAllCafes() {
    return prisma.cafe.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            orders: { where: { status: { in: ["PAID", "PREPARING", "READY", "COMPLETED"] } } },
            menuItems: true,
            users: true,
            staff: { where: { isActive: true } },
          },
        },
      },
    });
  },

  async getCafeById(id: string) {
    return prisma.cafe.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: { where: { status: { in: ["PAID", "PREPARING", "READY", "COMPLETED"] } } },
            menuItems: true,
            users: true,
            staff: { where: { isActive: true } },
          },
        },
        users: {
          where: { role: "CAFE_OWNER", isActive: true },
          select: { id: true, name: true, email: true },
          take: 1,
        },
      },
    });
  },

  async createCafe(data: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    imageUrl?: string;
  }) {
    return prisma.cafe.create({ data });
  },

  async updateCafe(
    id: string,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      imageUrl?: string;
      isActive?: boolean;
      openingTime?: string;
      closingTime?: string;
    }
  ) {
    return prisma.cafe.update({ where: { id }, data });
  },

  async updateCafePaymentCredentials(
    id: string,
    data: {
      phonepeMerchantId: string;
      phonepeSaltKey: string;
      phonepeSaltIndex?: string;
    }
  ) {
    return prisma.cafe.update({
      where: { id },
      data: {
        phonepeMerchantId: data.phonepeMerchantId,
        phonepeSaltKey: data.phonepeSaltKey,
        phonepeSaltIndex: data.phonepeSaltIndex || "1",
      },
      select: {
        id: true,
        phonepeMerchantId: true,
        phonepeSaltIndex: true,
        // phonepeSaltKey intentionally excluded from response
      },
    });
  },

  async clearCafePaymentCredentials(id: string) {
    return prisma.cafe.update({
      where: { id },
      data: {
        phonepeMerchantId: null,
        phonepeSaltKey: null,
        phonepeSaltIndex: "1",
      },
      select: { id: true },
    });
  },

  async setCafePaymentProvider(id: string, provider: PaymentProvider) {
    return prisma.cafe.update({
      where: { id },
      data: { paymentProvider: provider },
      select: { id: true, paymentProvider: true },
    });
  },

  async updateCafeRazorpayCredentials(
    id: string,
    data: {
      razorpayKeyId: string;
      razorpayKeySecret: string;
      razorpayWebhookSecret?: string;
    }
  ) {
    return prisma.cafe.update({
      where: { id },
      data: {
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecret: data.razorpayKeySecret,
        ...(data.razorpayWebhookSecret !== undefined && {
          razorpayWebhookSecret: data.razorpayWebhookSecret,
        }),
      },
      select: {
        id: true,
        razorpayKeyId: true,
        // razorpayKeySecret / razorpayWebhookSecret intentionally excluded from response
      },
    });
  },

  async clearCafeRazorpayCredentials(id: string) {
    return prisma.cafe.update({
      where: { id },
      data: {
        razorpayKeyId: null,
        razorpayKeySecret: null,
        razorpayWebhookSecret: null,
      },
      select: { id: true },
    });
  },

  async deleteCafe(id: string) {
    // Soft delete - deactivate instead of hard-deleting to preserve order history
    return prisma.cafe.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async hardDeleteCafe(id: string) {
    // Cascade delete everything: payments → orderItems → orders → menuItems → categories → tables → users → cafe
    // Delete in dependency order
    const orders = await prisma.order.findMany({ where: { cafeId: id }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { cafeId: id } });
    }

    await prisma.menuItem.deleteMany({ where: { cafeId: id } });
    await prisma.menuCategory.deleteMany({ where: { cafeId: id } });
    await prisma.table.deleteMany({ where: { cafeId: id } });
    await prisma.user.deleteMany({ where: { cafeId: id } });
    await prisma.cafe.delete({ where: { id } });
  },

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { cafe: { select: { name: true } } },
    });
  },

  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    cafeId?: string;
  }) {
    return prisma.user.create({ data });
  },

  /**
   * Get analytics for a specific cafe within a date range.
   * `from` is the start of the period, `to` defaults to now.
   */
  async getCafeAnalytics(cafeId: string, from: Date, to: Date = new Date()) {
    const where = {
      cafeId,
      status: { in: ["PAID", "PREPARING", "READY", "COMPLETED"] as Array<"PAID" | "PREPARING" | "READY" | "COMPLETED"> },
      createdAt: { gte: from, lte: to },
    };

    const [orderCount, revenue, recentOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _sum: { totalPaise: true },
      }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPaise: true,
          customerName: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      orders: orderCount,
      revenue: revenue._sum.totalPaise || 0,
      recentOrders,
    };
  },

  async getAnalyticsOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const PAID_STATUSES = ["PAID", "PREPARING", "READY", "COMPLETED"] as const;

    const cafes = await prisma.cafe.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });

    // Two grouped queries cover every cafe at once instead of 4 queries per
    // cafe, which used to scale linearly with the number of cafes.
    const [totalByCafe, todayByCafe] = await Promise.all([
      prisma.order.groupBy({
        by: ["cafeId"],
        where: { status: { in: [...PAID_STATUSES] } },
        _count: true,
        _sum: { totalPaise: true },
      }),
      prisma.order.groupBy({
        by: ["cafeId"],
        where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: todayStart } },
        _count: true,
        _sum: { totalPaise: true },
      }),
    ]);

    const totalMap = new Map(totalByCafe.map((r) => [r.cafeId, r]));
    const todayMap = new Map(todayByCafe.map((r) => [r.cafeId, r]));

    const cafeStats = cafes.map((cafe) => {
      const total = totalMap.get(cafe.id);
      const today = todayMap.get(cafe.id);
      return {
        cafeId: cafe.id,
        cafeName: cafe.name,
        cafeSlug: cafe.slug,
        totalOrders: total?._count ?? 0,
        todayOrders: today?._count ?? 0,
        totalRevenue: total?._sum.totalPaise ?? 0,
        todayRevenue: today?._sum.totalPaise ?? 0,
      };
    });

    return {
      activeCafes: cafes.length,
      totalOrders: cafeStats.reduce((sum, c) => sum + c.totalOrders, 0),
      totalRevenue: cafeStats.reduce((sum, c) => sum + c.totalRevenue, 0),
      todayOrders: cafeStats.reduce((sum, c) => sum + c.todayOrders, 0),
      todayRevenue: cafeStats.reduce((sum, c) => sum + c.todayRevenue, 0),
      cafeStats,
    };
  },

  async getAuditLogs(limit = 50, offset = 0) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, email: true } } },
      take: limit,
      skip: offset,
    });
  },
};
