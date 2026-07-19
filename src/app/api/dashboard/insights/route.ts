import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/backend/lib/auth";
import { insightsRepository } from "@/backend/repositories/insights.repository";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json(
        { success: false, error: "No cafe associated with this user" },
        { status: 403 }
      );
    }

    const windowParam = req.nextUrl.searchParams.get("windowDays");
    const parsed = windowParam ? parseInt(windowParam, 10) : 30;
    const windowDays = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 30;

    const cafe = await insightsRepository.getCafeInsights(cafeId, windowDays);
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        windowDays,
        generatedAt: new Date().toISOString(),
        cafe,
      },
    });
  } catch (error) {
    console.error("Owner insights error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
