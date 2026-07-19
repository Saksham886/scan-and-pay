import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { prisma } from "@/backend/lib/db";
import { sseManager } from "@/backend/lib/sse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Look up the item to get its cafeId for SSE broadcast
    const existing = await prisma.menuItem.findUnique({ where: { id }, select: { cafeId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    // Every item must have a category - reject explicit empty
    if ("categoryId" in body && !body.categoryId) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }

    const updated = await menuRepository.updateMenuItem(id, {
      name: body.name,
      description: body.description,
      pricePaise: body.pricePaise,
      imageUrl: body.imageUrl,
      isAvailable: body.isAvailable,
      isVeg: body.isVeg,
      categoryId: body.categoryId,
      sortOrder: body.sortOrder,
    });

    // Notify customers viewing this cafe's menu
    if (existing.cafeId) sseManager.broadcastMenuUpdate(existing.cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Menu update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Look up the item to get its cafeId for SSE broadcast
    const existing = await prisma.menuItem.findUnique({ where: { id }, select: { cafeId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    await menuRepository.deleteMenuItem(id);

    // Notify customers viewing this cafe's menu
    if (existing.cafeId) sseManager.broadcastMenuUpdate(existing.cafeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Menu delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
