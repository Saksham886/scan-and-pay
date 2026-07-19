import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { analyticsService } from "@/backend/services/analytics.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.split(",") || undefined;
    const limit = parseInt(searchParams.get("limit") || "200");
    const offset = parseInt(searchParams.get("offset") || "0");
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const cafeId = searchParams.get("cafeId") || null;

    const result = await analyticsService.getCafeOrders(cafeId, {
      status,
      limit,
      offset,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
