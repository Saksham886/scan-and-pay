import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";

function getDateRange(range: string): { gte: Date } | undefined {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  }
  if (range === "month") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (range === "year") {
    return { gte: new Date(now.getFullYear(), 0, 1) };
  }
  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const cafe = await prisma.cafe.findUnique({ where: { id }, select: { id: true } });
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    const range = req.nextUrl.searchParams.get("range") ?? "all";
    const dateFilter = getDateRange(range);

    const expenses = await prisma.expense.findMany({
      where: {
        cafeId: id,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      orderBy: { date: "desc" },
    });

    const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

    return NextResponse.json({ success: true, data: { expenses, totalPaise } });
  } catch (error) {
    console.error("Admin expenses GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}
