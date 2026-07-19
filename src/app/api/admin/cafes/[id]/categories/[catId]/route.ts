import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId, catId } = await params;
    const body = await request.json();

    const category = await menuRepository.updateCategory(catId, {
      name: body.name,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });

    sseManager.broadcastMenuUpdate(cafeId);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Admin category update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId, catId } = await params;
    await menuRepository.deleteCategory(catId);

    sseManager.broadcastMenuUpdate(cafeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin category delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 });
  }
}
