import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
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

    const updated = await menuRepository.updateMenuItem(itemId, {
      name: body.name,
      description: body.description,
      pricePaise: body.pricePaise,
      imageUrl: body.imageUrl,
      isAvailable: body.isAvailable,
      isVeg: body.isVeg,
      categoryId: body.categoryId,
      sortOrder: body.sortOrder,
    });

    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin menu update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId, itemId } = await params;
    await menuRepository.deleteMenuItem(itemId);

    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin menu delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
