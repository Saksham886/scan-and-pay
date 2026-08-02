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

    let updated;
    if (existing.cafeId === null) {
      // Editing a global item from a cafe's dashboard never mutates the
      // shared row — it creates/updates a cafe-specific override so the
      // change is scoped to this cafe alone.
      const cafeId = session.user.cafeId;
      if (!cafeId) {
        return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
      }
      if (typeof body.menuId !== "string") {
        return NextResponse.json({ success: false, error: "menuId is required to override a global item" }, { status: 400 });
      }
      updated = await menuRepository.upsertCafeOverride(id, cafeId, body.menuId, {
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
      sseManager.broadcastMenuUpdate(cafeId);
    } else {
      if (existing.cafeId !== session.user.cafeId && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      updated = await menuRepository.updateMenuItem(id, {
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
      sseManager.broadcastMenuUpdate(existing.cafeId);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Menu update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.menuItem.findUnique({ where: { id }, select: { cafeId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    if (existing.cafeId === null) {
      // "Delete" on a global item removes it from this cafe's menu only —
      // it becomes a hidden cafe-specific override, the shared item is untouched.
      const cafeId = session.user.cafeId;
      if (!cafeId) {
        return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
      }
      const menuId = new URL(request.url).searchParams.get("menuId");
      if (!menuId) {
        return NextResponse.json({ success: false, error: "menuId is required to remove a global item" }, { status: 400 });
      }
      // Soft-deleted as well as hidden: without deletedAt the override row is
      // still a live item, so the "removed" dish kept sitting in the owner's
      // dashboard looking like the delete had failed.
      await menuRepository.upsertCafeOverride(id, cafeId, menuId, {
        isAvailable: false,
        deletedAt: new Date(),
      });
      sseManager.broadcastMenuUpdate(cafeId);
    } else {
      if (existing.cafeId !== session.user.cafeId && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      await menuRepository.deleteMenuItem(id);
      sseManager.broadcastMenuUpdate(existing.cafeId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Menu delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
