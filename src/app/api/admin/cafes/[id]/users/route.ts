import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const cafe = await prisma.cafe.findUnique({ where: { id }, select: { id: true } });
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    const users = await prisma.user.findMany({
      where: { cafeId: id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Admin cafe users error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
