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
    if (!cafeId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const categories = await menuRepository.getCategories(cafeId);
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    if (!body.name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const category = await menuRepository.createCategory({
      cafeId,
      name: body.name,
      sortOrder: body.sortOrder,
    });

    sseManager.broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Category create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
  }
}
