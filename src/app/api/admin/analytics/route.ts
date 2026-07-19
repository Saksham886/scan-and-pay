import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { analyticsService } from "@/backend/services/analytics.service";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const overview = await analyticsService.getOverview();
    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
