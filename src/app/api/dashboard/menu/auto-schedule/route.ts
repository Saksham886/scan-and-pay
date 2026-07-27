import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

/**
 * PATCH /api/dashboard/menu/auto-schedule
 * Body: { enabled }. Toggles whether the active menu follows the meal-period
 * clock (Breakfast/Lunch/Evening Snacks/Dinner) or the manual per-menu toggle.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ success: false, error: "enabled must be a boolean" }, { status: 400 });
    }

    const updated = await menuRepository.setAutoSchedule(cafeId, body.enabled);
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Set auto-schedule error:", error);
    return NextResponse.json({ success: false, error: "Failed to update auto-schedule" }, { status: 500 });
  }
}
