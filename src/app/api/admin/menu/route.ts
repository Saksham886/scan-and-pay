import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";
import { sseManager } from "@/backend/lib/sse";
import { prisma } from "@/backend/lib/db";

async function broadcastMenuUpdate(cafeId: string | null) {
  if (cafeId) {
    sseManager.broadcastMenuUpdate(cafeId);
    return;
  }
  const cafes = await prisma.cafe.findMany({ where: { isActive: true }, select: { id: true } });
  for (const c of cafes) sseManager.broadcastMenuUpdate(c.id);
}

// GET /api/admin/menu?cafeId=<id>  - all items, optionally filtered by cafe
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId") ?? undefined;

    const items = await menuRepository.getAllMenuItemsAdmin(cafeId);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("Admin menu list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch items" }, { status: 500 });
  }
}

// POST /api/admin/menu - create a global item (cafeId omitted) or cafe-specific item
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const cafeId: string | null = body.cafeId || null;

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

    await broadcastMenuUpdate(cafeId);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Admin menu create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create item" }, { status: 500 });
  }
}
