import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

/**
 * PATCH /api/admin/cafes/[id]/menu/active
 * Mirrors /api/dashboard/menu/active for the super admin's per-cafe menu view.
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
    console.error("Admin set active menu error:", error);
    return NextResponse.json({ success: false, error: "Failed to set active menu" }, { status: 500 });
  }
}
