import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: cafeId } = await params;
    const items = await menuRepository.getAllMenuItems(cafeId);
    const categories = await menuRepository.getCategories(cafeId);

    return NextResponse.json({ success: true, data: { items, categories } });
  } catch (error) {
    console.error("Admin cafe menu error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch menu" }, { status: 500 });
  }
}

export async function POST(
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

    if (!body.name || typeof body.pricePaise !== "number") {
      return NextResponse.json({ success: false, error: "Name and price are required" }, { status: 400 });
    }
    if (!body.categoryId) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }

    const item = await menuRepository.createMenuItem({
      cafeId,
      menuId: typeof body.menuId === "string" ? body.menuId : undefined,
      name: body.name,
      description: body.description,
      pricePaise: body.pricePaise,
      categoryId: body.categoryId,
      imageUrl: body.imageUrl,
      isVeg: body.isVeg,
      isSubsidised: body.isSubsidised,
    });

    // Notify customers viewing this cafe
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Admin menu create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create item" }, { status: 500 });
  }
}
