import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

/**
 * PATCH /api/dashboard/menu/active
 * Body: { menuId }. Switches which of the cafe's 4 menus is currently
 * shown to customers (Breakfast/Lunch/Evening Snacks/Dinner).
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
    if (typeof body.menuId !== "string") {
      return NextResponse.json({ success: false, error: "menuId is required" }, { status: 400 });
    }

    const menu = await prisma.menu.findUnique({ where: { id: body.menuId }, select: { cafeId: true } });
    if (!menu || menu.cafeId !== cafeId) {
      return NextResponse.json({ success: false, error: "Menu not found" }, { status: 404 });
    }

    const updated = await menuRepository.setActiveMenu(cafeId, body.menuId);
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Set active menu error:", error);
    return NextResponse.json({ success: false, error: "Failed to set active menu" }, { status: 500 });
  }
}
