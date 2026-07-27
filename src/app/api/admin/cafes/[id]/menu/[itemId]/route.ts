import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { prisma } from "@/backend/lib/db";
import { sseManager } from "@/backend/lib/sse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId, itemId } = await params;
    const body = await request.json();

    if ("categoryId" in body && !body.categoryId) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }

    const existing = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { cafeId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    let updated;
    if (existing.cafeId === null) {
      // Editing a global item from this cafe's menu view creates a
      // cafe-specific override rather than changing the shared catalog —
      // use /admin/menu directly to edit the global item itself.
      if (typeof body.menuId !== "string") {
        return NextResponse.json({ success: false, error: "menuId is required to override a global item" }, { status: 400 });
      }
      updated = await menuRepository.upsertCafeOverride(itemId, cafeId, body.menuId, {
        name: body.name,
        description: body.description,
        pricePaise: body.pricePaise,
        imageUrl: body.imageUrl,
        isAvailable: body.isAvailable,
        isVeg: body.isVeg,
        categoryId: body.categoryId,
        sortOrder: body.sortOrder,
        isSubsidised: body.isSubsidised,
      });
    } else {
      updated = await menuRepository.updateMenuItem(itemId, {
        name: body.name,
        description: body.description,
        pricePaise: body.pricePaise,
        imageUrl: body.imageUrl,
        isAvailable: body.isAvailable,
        isVeg: body.isVeg,
        categoryId: body.categoryId,
        sortOrder: body.sortOrder,
        isSubsidised: body.isSubsidised,
      });
    }

    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin menu update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId, itemId } = await params;

    const existing = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { cafeId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    if (existing.cafeId === null) {
      const menuId = new URL(request.url).searchParams.get("menuId");
      if (!menuId) {
        return NextResponse.json({ success: false, error: "menuId is required to remove a global item" }, { status: 400 });
      }
      await menuRepository.upsertCafeOverride(itemId, cafeId, menuId, { isAvailable: false });
    } else {
      await menuRepository.deleteMenuItem(itemId);
    }

    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin menu delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
