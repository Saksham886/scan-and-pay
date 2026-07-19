import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
    }

    if (!cafeId) {
      return NextResponse.json({ success: true, data: { items: [], categories: [] } });
    }

    const items = await menuRepository.getAllMenuItems(cafeId);
    const categories = await menuRepository.getCategories(cafeId);

    return NextResponse.json({ success: true, data: { items, categories } });
  } catch (error) {
    console.error("Dashboard menu error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch menu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["CAFE_OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name || typeof body.pricePaise !== "number") {
      return NextResponse.json({ success: false, error: "Name and price are required" }, { status: 400 });
    }
    if (!body.categoryId) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }

    const item = await menuRepository.createMenuItem({
      cafeId,
      name: body.name,
      description: body.description,
      pricePaise: body.pricePaise,
      categoryId: body.categoryId,
      imageUrl: body.imageUrl,
      isVeg: body.isVeg,
    });

    // Notify all customers viewing this cafe's menu
    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Menu create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create item" }, { status: 500 });
  }
}
