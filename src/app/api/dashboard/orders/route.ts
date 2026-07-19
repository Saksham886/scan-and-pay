import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { analyticsService } from "@/backend/services/analytics.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.split(",") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;

    const cafeId = session.user.role === "SUPER_ADMIN"
      ? searchParams.get("cafeId") || null
      : session.user.cafeId || null;

    if (!cafeId && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "No cafe associated with this user" },
        { status: 403 }
      );
    }

    const result = await analyticsService.getCafeOrders(cafeId, {
      status,
      limit,
      offset,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Dashboard orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
