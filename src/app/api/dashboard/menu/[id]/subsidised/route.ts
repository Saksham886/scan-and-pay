import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

/**
 * PATCH /api/dashboard/menu/[id]/subsidised
 * [id] here is a menuId (nested under the same dynamic segment as the
 * item-scoped /api/dashboard/menu/[id] route). Body: { isSubsidised }.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
    }

    const { id: menuId } = await params;
    const body = await request.json();
    if (typeof body.isSubsidised !== "boolean") {
      return NextResponse.json({ success: false, error: "isSubsidised must be a boolean" }, { status: 400 });
    }

    const menu = await prisma.menu.findUnique({ where: { id: menuId }, select: { cafeId: true } });
    if (!menu || menu.cafeId !== cafeId) {
      return NextResponse.json({ success: false, error: "Menu not found" }, { status: 404 });
    }

    const updated = await menuRepository.setMenuSubsidised(menuId, body.isSubsidised);
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Set menu subsidised error:", error);
    return NextResponse.json({ success: false, error: "Failed to update menu" }, { status: 500 });
  }
}
