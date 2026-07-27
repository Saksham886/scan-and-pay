import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { menuRepository } from "@/backend/repositories/menu.repository";

/**
 * GET /api/admin/cafes/[id]/menu/bundle
 * Mirrors /api/dashboard/menu/bundle for the super admin's per-cafe menu view.
 */
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
    const bundle = await menuRepository.getMenuBundle(cafeId);
    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("Admin menu bundle error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch menu bundle" }, { status: 500 });
  }
}
