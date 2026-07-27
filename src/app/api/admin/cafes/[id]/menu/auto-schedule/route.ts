import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

/**
 * PATCH /api/admin/cafes/[id]/menu/auto-schedule
 * Mirrors /api/dashboard/menu/auto-schedule for the super admin's per-cafe view.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId } = await params;
    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ success: false, error: "enabled must be a boolean" }, { status: 400 });
    }

    const updated = await menuRepository.setAutoSchedule(cafeId, body.enabled);
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin set auto-schedule error:", error);
    return NextResponse.json({ success: false, error: "Failed to update auto-schedule" }, { status: 500 });
  }
}
