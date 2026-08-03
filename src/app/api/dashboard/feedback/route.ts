import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/backend/lib/auth";
import { feedbackService } from "@/backend/services/feedback.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({
        success: true,
        data: { entries: [], total: 0, averageRating: null, sessionStats: [] },
      });
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const offsetParam = req.nextUrl.searchParams.get("offset");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100) : 50;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

    // The rollup spans every survey row, not just the page being listed, so it
    // can't be derived from `result.entries` on the client.
    const [result, sessionStats] = await Promise.all([
      feedbackService.getFeedbackForCafe(cafeId, { limit, offset }),
      feedbackService.getSessionStatsForCafe(cafeId),
    ]);
    return NextResponse.json({ success: true, data: { ...result, sessionStats } });
  } catch (error) {
    console.error("Dashboard feedback error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 });
  }
}
