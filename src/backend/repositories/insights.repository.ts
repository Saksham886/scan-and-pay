import { prisma } from "@/backend/lib/db";
import type { CafeInsights, TopItemInsight } from "@/shared/types";

const VALID_STATUSES = ["PAID", "PREPARING", "READY", "COMPLETED"] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const insightsRepository = {
  /**
   * Compute deep business insights for every active cafe over the last `windowDays`.
   * Per-cafe aggregations are run in parallel.
   */
  async getDeepInsights(windowDays = 30): Promise<CafeInsights[]> {
    const from = new Date();
    from.setDate(from.getDate() - windowDays);
    from.setHours(0, 0, 0, 0);

    const cafes = await prisma.cafe.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return Promise.all(cafes.map((c) => buildCafeInsights(c, from)));
  },

  /**
   * Compute deep insights for a single cafe over the last `windowDays`.
   * Returns null if the cafe doesn't exist.
   */
  async getCafeInsights(cafeId: string, windowDays = 30): Promise<CafeInsights | null> {
    const from = new Date();
    from.setDate(from.getDate() - windowDays);
    from.setHours(0, 0, 0, 0);

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { id: true, name: true, slug: true },
    });
    if (!cafe) return null;

    return buildCafeInsights(cafe, from);
  },
};

async function buildCafeInsights(
  cafe: { id: string; name: string; slug: string },
  from: Date
): Promise<CafeInsights> {
  const baseWhere = {
    cafeId: cafe.id,
    status: { in: [...VALID_STATUSES] },
    createdAt: { gte: from },
  };

  const [
    orders,
    aggregate,
    customerGroups,
    topItems,
    tableGroups,
    lastOrder,
  ] = await Promise.all([
    prisma.order.findMany({
      where: baseWhere,
      select: { createdAt: true, totalPaise: true, customerPhone: true, tableId: true },
    }),
    prisma.order.aggregate({
      where: baseWhere,
      _sum: { totalPaise: true },
      _count: { _all: true },
      _avg: { totalPaise: true },
    }),
    prisma.order.groupBy({
      by: ["customerPhone"],
      where: { ...baseWhere, customerPhone: { not: null } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId", "itemName"],
      where: { order: baseWhere },
      _sum: { quantity: true, subtotalPaise: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["tableId"],
      where: { ...baseWhere, tableId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { tableId: "desc" } },
      take: 1,
    }),
    prisma.order.findFirst({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const hourHistogram = new Array<number>(24).fill(0);
  const dayHistogram = new Array<number>(7).fill(0);
  for (const o of orders) {
    hourHistogram[o.createdAt.getHours()]++;
    dayHistogram[o.createdAt.getDay()]++;
  }

  let peakHour: number | null = null;
  let peakHourOrders = 0;
  hourHistogram.forEach((v, i) => {
    if (v > peakHourOrders) {
      peakHourOrders = v;
      peakHour = i;
    }
  });

  let peakDayOfWeek: number | null = null;
  let peakDayOrders = 0;
  dayHistogram.forEach((v, i) => {
    if (v > peakDayOrders) {
      peakDayOrders = v;
      peakDayOfWeek = i;
    }
  });

  // Last 7 days rolling trend
  const today = startOfDay(new Date());
  const trendDays: { date: string; revenuePaise: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trendDays.push({ date: dateKey(d), revenuePaise: 0, orders: 0 });
  }
  const trendIndex = new Map(trendDays.map((t, i) => [t.date, i]));
  for (const o of orders) {
    const key = dateKey(startOfDay(o.createdAt));
    const idx = trendIndex.get(key);
    if (idx !== undefined) {
      trendDays[idx].revenuePaise += o.totalPaise;
      trendDays[idx].orders += 1;
    }
  }

  const uniqueCustomers = customerGroups.length;
  const repeatCustomers = customerGroups.filter((g) => g._count._all > 1).length;
  const repeatRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  const topItemsByQuantity: TopItemInsight[] = topItems.map((t) => ({
    menuItemId: t.menuItemId,
    name: t.itemName,
    quantitySold: t._sum.quantity || 0,
    revenuePaise: t._sum.subtotalPaise || 0,
  }));

  // Top by revenue (separate query so it's not skewed by the qty ordering)
  const topByRevenueRow = await prisma.orderItem.groupBy({
    by: ["menuItemId", "itemName"],
    where: { order: baseWhere },
    _sum: { quantity: true, subtotalPaise: true },
    orderBy: { _sum: { subtotalPaise: "desc" } },
    take: 1,
  });
  const topItemByRevenue: TopItemInsight | null = topByRevenueRow[0]
    ? {
        menuItemId: topByRevenueRow[0].menuItemId,
        name: topByRevenueRow[0].itemName,
        quantitySold: topByRevenueRow[0]._sum.quantity || 0,
        revenuePaise: topByRevenueRow[0]._sum.subtotalPaise || 0,
      }
    : null;

  let mostUsedTable: CafeInsights["mostUsedTable"] = null;
  if (tableGroups[0]?.tableId) {
    const table = await prisma.table.findUnique({
      where: { id: tableGroups[0].tableId },
      select: { tableNumber: true },
    });
    if (table) {
      mostUsedTable = {
        tableNumber: table.tableNumber,
        orders: tableGroups[0]._count._all,
      };
    }
  }

  const totalOrders = aggregate._count._all;
  const totalRevenue = aggregate._sum.totalPaise || 0;
  const avgOrderValuePaise = Math.round(aggregate._avg.totalPaise || 0);

  return {
    cafeId: cafe.id,
    cafeName: cafe.name,
    cafeSlug: cafe.slug,
    totalOrders,
    totalRevenue,
    avgOrderValuePaise,
    uniqueCustomers,
    repeatCustomers,
    repeatRate,
    peakHour,
    peakHourOrders,
    peakDayOfWeek,
    peakDayOrders,
    hourHistogram,
    dayHistogram,
    last7DaysRevenue: trendDays,
    topItemsByQuantity,
    topItemByRevenue,
    mostUsedTable,
    lastOrderAt: lastOrder?.createdAt.toISOString() ?? null,
  };
}
