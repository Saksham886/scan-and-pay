import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";

/**
 * GET /api/dashboard/menu/bundle
 * All 4 menus (Breakfast/Lunch/Evening Snacks/Dinner) with nested
 * categories/items in one call, for the admin 4-tab menu management UI.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({ success: true, data: { menus: [], autoScheduleMenus: true } });
    }

    const bundle = await menuRepository.getMenuBundle(cafeId);
    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("Menu bundle error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch menu bundle" }, { status: 500 });
  }
}
