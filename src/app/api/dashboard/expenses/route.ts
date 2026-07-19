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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cafeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const range = req.nextUrl.searchParams.get("range") ?? "all";
    const dateFilter = getDateRange(range);

    const expenses = await prisma.expense.findMany({
      where: {
        cafeId: session.user.cafeId,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      orderBy: { date: "desc" },
    });

    const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

    return NextResponse.json({ success: true, data: { expenses, totalPaise } });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cafeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, amountPaise, category, date } = body;

    if (!title || !amountPaise || amountPaise <= 0) {
      return NextResponse.json({ success: false, error: "Title and amount are required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        cafeId: session.user.cafeId,
        title: title.trim(),
        description: description?.trim() || null,
        amountPaise: Math.round(amountPaise),
        category: category?.trim() || "General",
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to add expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cafeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Expense ID required" }, { status: 400 });
    }

    const expense = await prisma.expense.findFirst({
      where: { id, cafeId: session.user.cafeId },
    });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete expense" }, { status: 500 });
  }
}
