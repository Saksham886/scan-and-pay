import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";

// GET /api/admin/categories?cafeId=<id|null>
//   - no cafeId  -> all categories
//   - cafeId="null" -> global categories only
//   - cafeId=<uuid> -> cafe + global
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId") ?? undefined;

    const categories = await menuRepository.getCategories(cafeId);
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Admin categories fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

// DELETE /api/admin/categories?id=<categoryId>
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    await menuRepository.deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin category delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 });
  }
}

// POST /api/admin/categories
//   body: { name, cafeId?: string|null, sortOrder? }
//   cafeId omitted/null -> creates a GLOBAL category
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const category = await menuRepository.createCategory({
      cafeId: body.cafeId ?? null,
      name: body.name,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Admin category create error:", error);
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
  }
}
