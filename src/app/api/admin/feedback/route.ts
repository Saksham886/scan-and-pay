import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/backend/lib/auth";
import { feedbackService } from "@/backend/services/feedback.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = req.nextUrl.searchParams.get("cafeId") || undefined;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const offsetParam = req.nextUrl.searchParams.get("offset");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100) : 50;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

    const result = await feedbackService.getAllFeedback({ cafeId, limit, offset });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin feedback error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 });
  }
}
