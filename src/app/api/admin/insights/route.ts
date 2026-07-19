import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/backend/lib/auth";
import { insightsRepository } from "@/backend/repositories/insights.repository";
import type { DeepInsightsResponse } from "@/shared/types";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const windowParam = req.nextUrl.searchParams.get("windowDays");
    const parsed = windowParam ? parseInt(windowParam, 10) : 30;
    const windowDays = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 30;

    const cafes = await insightsRepository.getDeepInsights(windowDays);
    const data: DeepInsightsResponse = {
      windowDays,
      generatedAt: new Date().toISOString(),
      cafes,
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
